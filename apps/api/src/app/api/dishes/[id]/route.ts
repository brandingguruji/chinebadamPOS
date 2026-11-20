import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded, serializeDoc } from '@/lib/seed';
import { DishModel } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

async function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return await verifyToken(authHeader.slice(7));
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureSeeded();
  const doc = await DishModel.findById(params.id);
  if (!doc) return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
  return NextResponse.json(serializeDoc(doc));
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureSeeded();
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) {
        return NextResponse.json({ error: 'Dish name must be at least 2 characters' }, { status: 400 });
      }
      updateData.name = name;
    }
    if (body.category !== undefined) {
      const category = String(body.category).trim();
      if (!category) return NextResponse.json({ error: 'Category is required' }, { status: 400 });
      updateData.category = category;
    }
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (Number.isNaN(price) || price <= 0) {
        return NextResponse.json({ error: 'Price must be greater than 0' }, { status: 400 });
      }
      updateData.price = price;
    }
    if (body.description !== undefined) updateData.description = String(body.description).trim();
    if (body.image !== undefined) updateData.image = String(body.image).trim();
    if (body.available !== undefined) updateData.available = Boolean(body.available);

    const updated = await DishModel.findByIdAndUpdate(params.id, updateData, { new: true });
    if (!updated) return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
    return NextResponse.json(serializeDoc(updated));
  } catch {
    return NextResponse.json({ error: 'Failed to update dish' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureSeeded();
  const deleted = await DishModel.findByIdAndDelete(params.id);
  if (!deleted) return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
  return NextResponse.json({ message: 'Dish deleted' });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
