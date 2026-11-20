import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded, serializeDoc } from '@/lib/seed';
import { ExpenseModel } from '@/lib/models';
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
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'all';
  const value = searchParams.get('value') || '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = {};
  const now = new Date();

  if (period === 'daily' && value) {
    const [y, m, d] = value.split('-').map(Number);
    if (y && m && d) {
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
      query = { $or: [{ date: { $gte: start, $lt: end } }, { createdAt: { $gte: start, $lt: end } }] };
    }
  } else if (period === 'monthly' && value) {
    const [y, m] = value.split('-').map(Number);
    if (y && m) {
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 1, 0, 0, 0, 0);
      query = { $or: [{ date: { $gte: start, $lt: end } }, { createdAt: { $gte: start, $lt: end } }] };
    }
  } else if (period === 'yearly') {
    const year = Number(value) || now.getFullYear();
    const start = new Date(year, 0, 1, 0, 0, 0, 0);
    const end = new Date(year + 1, 0, 1, 0, 0, 0, 0);
    query = { $or: [{ date: { $gte: start, $lt: end } }, { createdAt: { $gte: start, $lt: end } }] };
  }

  const docs = await ExpenseModel.find(query).sort({ date: -1, createdAt: -1 });
  return NextResponse.json(docs.map(serializeDoc));
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureSeeded();
    const { amount, description, category, date } = await request.json();

    if (amount === undefined || Number(amount) <= 0 || !description?.trim()) {
      return NextResponse.json(
        { error: 'Valid amount and description are required' },
        { status: 400 }
      );
    }

    const created = await ExpenseModel.create({
      amount: Number(amount),
      description: description.trim(),
      category: category?.trim() || 'General',
      date: date ? new Date(date) : new Date(),
    });

    return NextResponse.json(serializeDoc(created), { status: 201 });
  } catch (err) {
    console.error('Expense create error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
