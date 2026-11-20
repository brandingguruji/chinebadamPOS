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

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureSeeded();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  const query = category ? { category } : {};
  const docs = await DishModel.find(query).sort({ createdAt: -1 });
  return NextResponse.json(docs.map(serializeDoc));
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureSeeded();
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const category = String(body.category ?? '').trim();
    const price = Number(body.price);
    const description = String(body.description ?? '').trim();
    const image = String(body.image ?? '').trim();
    const available = body.available !== undefined ? Boolean(body.available) : true;

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Dish name must be at least 2 characters' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }
    if (Number.isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Price must be greater than 0' }, { status: 400 });
    }

    const created = await DishModel.create({
      name,
      category,
      price,
      description,
      image,
      available,
    });
    return NextResponse.json(serializeDoc(created), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create dish' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
