import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { serializeDoc } from '@/lib/seed';
import { OrderModel, ExpenseModel } from '@/lib/models';
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

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const period = (searchParams.get('period') || 'monthly') as 'daily' | 'monthly' | 'yearly';
  const value = searchParams.get('value') || searchParams.get('month') || '';

  let startDate: Date;
  let endDate: Date;
  let label: string;

  if (period === 'daily') {
    const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const [y, m, d] = (value || fallback).split('-').map(Number);
    startDate = new Date(y || now.getFullYear(), (m || now.getMonth() + 1) - 1, d || now.getDate(), 0, 0, 0, 0);
    endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1, 0, 0, 0, 0);
    label = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
  } else if (period === 'yearly') {
    const year = Number(value) || now.getFullYear();
    startDate = new Date(year, 0, 1, 0, 0, 0, 0);
    endDate = new Date(year + 1, 0, 1, 0, 0, 0, 0);
    label = String(year);
  } else {
    const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [y, m] = (value || fallback).split('-').map(Number);
    const year = y || now.getFullYear();
    const monthIndex = (m || now.getMonth() + 1) - 1;
    startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    endDate = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
    label = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  }

  const [rawOrders, rawExpenses] = await Promise.all([
    OrderModel.find({
      $or: [
        { createdAt: { $gte: startDate, $lt: endDate } },
        { date: { $gte: startDate, $lt: endDate } },
      ],
    }).sort({ createdAt: -1 }),
    ExpenseModel.find({
      $or: [
        { date: { $gte: startDate, $lt: endDate } },
        { createdAt: { $gte: startDate, $lt: endDate } },
      ],
    }).sort({ date: -1, createdAt: -1 }),
  ]);

  const orders = rawOrders.map(serializeDoc);
  const expenses = rawExpenses.map(serializeDoc);

  const totalSales = parseFloat(
    orders.reduce((sum, o) => sum + Number(o.total || 0), 0).toFixed(2)
  );
  const totalExpenses = parseFloat(
    expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0).toFixed(2)
  );
  const netProfit = parseFloat((totalSales - totalExpenses).toFixed(2));

  return NextResponse.json({
    period,
    month: label,
    totalSales,
    totalExpenses,
    netProfit,
    orderCount: orders.length,
    expenseCount: expenses.length,
    orders,
    expenses,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
