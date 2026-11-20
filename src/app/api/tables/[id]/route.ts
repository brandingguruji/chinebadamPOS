import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded, serializeDoc } from '@/lib/seed';
import { TableModel } from '@/lib/models';
import { verifyToken } from '@/lib/jwt';

const VALID_STATUSES = ['Available', 'Occupied', 'Reserved'];

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
  const doc = await TableModel.findById(params.id);
  if (!doc) return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  return NextResponse.json(serializeDoc(doc));
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureSeeded();
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.number !== undefined) {
      const num = Number(body.number);
      if (!Number.isInteger(num) || num <= 0) {
        return NextResponse.json({ error: 'Table number must be a positive whole number' }, { status: 400 });
      }
      const conflict = await TableModel.findOne({ number: num, _id: { $ne: params.id } });
      if (conflict) {
        return NextResponse.json({ error: `Table #${num} already exists` }, { status: 409 });
      }
      updateData.number = num;
    }

    if (body.capacity !== undefined) {
      const cap = Number(body.capacity);
      if (!Number.isInteger(cap) || cap <= 0 || cap > 50) {
        return NextResponse.json({ error: 'Capacity must be between 1 and 50 seats' }, { status: 400 });
      }
      updateData.capacity = cap;
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid table status' }, { status: 400 });
      }
      updateData.status = body.status;
    }

    const updated = await TableModel.findByIdAndUpdate(params.id, updateData, { new: true });
    if (!updated) return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    return NextResponse.json(serializeDoc(updated));
  } catch {
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureSeeded();
  const deleted = await TableModel.findByIdAndDelete(params.id);
  if (!deleted) return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  return NextResponse.json({ message: 'Table deleted' });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
