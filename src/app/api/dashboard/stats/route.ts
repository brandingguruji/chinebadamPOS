import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { OrderModel, TableModel } from '@/lib/models';
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

function buildDateRangeQuery(dateParam: string | null) {
  if (!dateParam || dateParam === 'all') return {};
  const parts = dateParam.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return {};
  const [y, m, d] = parts;
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return {
    $or: [
      { createdAt: { $gte: start, $lt: end } },
      { date: { $gte: start, $lt: end } },
    ],
  };
}

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const orderQuery = buildDateRangeQuery(dateParam);

  const [orders, tables] = await Promise.all([
    OrderModel.find(orderQuery),
    TableModel.find(),
  ]);

  const activeStatuses = ['InKitchen', 'WaitList', 'Ready'];
  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter((o) => o.status === 'Served')
    .reduce((sum, o) => sum + Number(o.total || o.totalAmount || 0), 0);
  const activeOrders = orders.filter((o) => activeStatuses.includes(o.status)).length;
  const totalTables = tables.length;
  const occupiedTables = tables.filter((t) => t.status === 'Occupied').length;

  return NextResponse.json({
    totalOrders,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    activeOrders,
    totalTables,
    occupiedTables,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
