import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded, serializeDoc } from '@/lib/seed';
import { ExpenseModel } from '@/lib/models';
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

    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (Number.isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
      }
      updateData.amount = amount;
    }

    if (body.description !== undefined) {
      const desc = String(body.description).trim();
      if (desc.length < 2) {
        return NextResponse.json({ error: 'Description must be at least 2 characters' }, { status: 400 });
      }
      updateData.description = desc;
    }

    if (body.category !== undefined) {
      updateData.category = String(body.category).trim() || 'General';
    }

    if (body.date !== undefined) {
      const parsed = new Date(body.date);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      updateData.date = parsed;
    }

    const updated = await ExpenseModel.findByIdAndUpdate(params.id, updateData, { new: true });
    if (!updated) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    return NextResponse.json(serializeDoc(updated));
  } catch {
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureSeeded();
  const deleted = await ExpenseModel.findByIdAndDelete(params.id);
  if (!deleted) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  return NextResponse.json({ message: 'Expense deleted' });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
