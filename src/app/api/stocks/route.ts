import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { serializeDoc } from '@/lib/seed';
import { StockModel } from '@/lib/models';
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

  await connectDB();
  const docs = await StockModel.find().sort({ quantity: 1, name: 1 }).lean();
  return NextResponse.json(docs.map(serializeDoc));
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const category = String(body.category ?? 'Grocery').trim() || 'Grocery';
    const unit = String(body.unit ?? 'pcs').trim() || 'pcs';
    const quantity = Number(body.quantity);
    const minThreshold = Number(body.minThreshold);

    if (name.length < 2) {
      return NextResponse.json({ error: 'Item name must be at least 2 characters' }, { status: 400 });
    }
    if (Number.isNaN(quantity) || quantity < 0) {
      return NextResponse.json({ error: 'Quantity cannot be negative' }, { status: 400 });
    }
    if (Number.isNaN(minThreshold) || minThreshold < 0) {
      return NextResponse.json({ error: 'Low stock alert threshold cannot be negative' }, { status: 400 });
    }

    const created = await StockModel.create({
      name,
      category,
      unit,
      quantity,
      minThreshold,
    });
    return NextResponse.json(serializeDoc(created), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to add stock item' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
