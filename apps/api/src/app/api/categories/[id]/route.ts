import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded, serializeDoc } from '@/lib/seed';
import { CategoryModel, DishModel } from '@/lib/models';
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureSeeded();
    const body = await request.json();
    const name = String(body.name ?? '').trim();

    if (name.length < 2) {
      return NextResponse.json({ error: 'Category name must be at least 2 characters' }, { status: 400 });
    }

    const existing = await CategoryModel.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const conflict = await CategoryModel.findOne({
      _id: { $ne: params.id },
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (conflict) {
      return NextResponse.json({ error: `Category "${name}" already exists` }, { status: 409 });
    }

    const oldName = existing.name;
    const updated = await CategoryModel.findByIdAndUpdate(params.id, { name }, { new: true });

    // Sync dishes that used the old category name
    if (oldName && oldName !== name) {
      await DishModel.updateMany({ category: oldName }, { $set: { category: name } });
    }

    return NextResponse.json(serializeDoc(updated));
  } catch {
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureSeeded();
  const deleted = await CategoryModel.findByIdAndDelete(params.id);
  if (!deleted) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  return NextResponse.json({ message: 'Category deleted' });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
