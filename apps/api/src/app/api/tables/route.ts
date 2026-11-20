import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded, serializeDoc } from '@/lib/seed';
import { TableModel } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

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

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureSeeded();
  const docs = await TableModel.find().sort({ number: 1 });
  return NextResponse.json(docs.map(serializeDoc));
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureSeeded();
    const body = await request.json();
    const number = Number(body.number);
    const capacity = Number(body.capacity);
    const status = body.status ?? 'Available';

    if (!Number.isInteger(number) || number <= 0) {
      return NextResponse.json({ error: 'Table number must be a positive whole number' }, { status: 400 });
    }
    if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 50) {
      return NextResponse.json({ error: 'Capacity must be between 1 and 50 seats' }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid table status' }, { status: 400 });
    }

    const exists = await TableModel.findOne({ number });
    if (exists) {
      return NextResponse.json({ error: `Table #${number} already exists` }, { status: 409 });
    }

    const created = await TableModel.create({ number, capacity, status });
    return NextResponse.json(serializeDoc(created), { status: 201 });
  } catch (err) {
    console.error('Table POST error:', err);
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
