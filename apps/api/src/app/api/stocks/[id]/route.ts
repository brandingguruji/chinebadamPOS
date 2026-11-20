import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded, serializeDoc } from '@/lib/seed';
import { StockModel } from '@/lib/models';
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
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) {
        return NextResponse.json({ error: 'Item name must be at least 2 characters' }, { status: 400 });
      }
      updateData.name = name;
    }
    if (body.category !== undefined) updateData.category = String(body.category).trim() || 'Grocery';
    if (body.unit !== undefined) updateData.unit = String(body.unit).trim() || 'pcs';
    if (body.quantity !== undefined) {
      const q = Number(body.quantity);
      if (Number.isNaN(q) || q < 0) {
        return NextResponse.json({ error: 'Quantity cannot be negative' }, { status: 400 });
      }
      updateData.quantity = q;
    }
    if (body.minThreshold !== undefined) {
      const m = Number(body.minThreshold);
      if (Number.isNaN(m) || m < 0) {
        return NextResponse.json({ error: 'Threshold cannot be negative' }, { status: 400 });
      }
      updateData.minThreshold = m;
    }

    const updated = await StockModel.findByIdAndUpdate(params.id, updateData, { new: true });
    if (!updated) return NextResponse.json({ error: 'Stock item not found' }, { status: 404 });
    return NextResponse.json(serializeDoc(updated));
  } catch {
    return NextResponse.json({ error: 'Failed to update stock item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureSeeded();
  const deleted = await StockModel.findByIdAndDelete(params.id);
  if (!deleted) return NextResponse.json({ error: 'Stock item not found' }, { status: 404 });
  return NextResponse.json({ message: 'Stock item deleted' });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
