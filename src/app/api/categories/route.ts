import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded, serializeDoc } from '@/lib/seed';
import { CategoryModel } from '@/lib/models';
import { verifyToken } from '@/lib/jwt';

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
  const docs = await CategoryModel.find().sort({ name: 1 });
  return NextResponse.json(docs.map(serializeDoc));
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureSeeded();
    const body = await request.json();
    const name = String(body.name ?? '').trim();

    if (name.length < 2) {
      return NextResponse.json({ error: 'Category name must be at least 2 characters' }, { status: 400 });
    }

    const exists = await CategoryModel.findOne({
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (exists) {
      return NextResponse.json({ error: `Category "${name}" already exists` }, { status: 409 });
    }

    const created = await CategoryModel.create({ name });
    return NextResponse.json(serializeDoc(created), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
