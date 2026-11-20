import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded, serializeDoc } from '@/lib/seed';
import { OrderModel, TableModel, DishModel } from '@/lib/models';
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
  const statusParam = searchParams.get('status');
  const dateParam = searchParams.get('date');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [];
  if (statusParam) {
    conditions.push({ status: { $in: statusParam.split(',') } });
  }
  if (dateParam && dateParam !== 'all') {
    const parts = dateParam.split('-').map(Number);
    if (parts.length === 3 && !parts.some(Number.isNaN)) {
      const [y, m, d] = parts;
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
      conditions.push({
        $or: [
          { createdAt: { $gte: start, $lt: end } },
          { date: { $gte: start, $lt: end } },
        ],
      });
    }
  }

  const query = conditions.length > 0 ? { $and: conditions } : {};
  const docs = await OrderModel.find(query).sort({ createdAt: -1 });
  return NextResponse.json(docs.map(serializeDoc));
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureSeeded();
    const { tableId, items, paymentMethod, status, customerName, orderType } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    let resolvedTableId = 'takeaway';
    let resolvedTableNumber = 0;

    if (tableId && tableId !== 'takeaway') {
      const table = await TableModel.findById(tableId);
      if (!table) {
        return NextResponse.json({ error: 'Selected table not found' }, { status: 404 });
      }
      resolvedTableId = String(table._id);
      resolvedTableNumber = table.number;
      await TableModel.findByIdAndUpdate(tableId, { status: 'Occupied' });
    }

    const allDishes = await DishModel.find();
    const enrichedItems = items.map((item: { dishId: string; quantity: number; unitPrice?: number; dishName?: string }) => {
      const dish = allDishes.find((d) => String(d._id) === item.dishId);
      return {
        dishId: item.dishId,
        dishName: item.dishName ?? dish?.name ?? 'Unknown',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice ?? dish?.price ?? 0),
      };
    });

    const subtotal = parseFloat(
      enrichedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2)
    );
    const tax = parseFloat((subtotal * 0.05).toFixed(2));
    const donation = 0;
    const total = parseFloat((subtotal + tax + donation).toFixed(2));

    const count = await OrderModel.countDocuments();
    const orderNumber = `#F${String(count + 27).padStart(4, '0')}`;

    const created = await OrderModel.create({
      orderNumber,
      tableId: resolvedTableId,
      tableNumber: resolvedTableNumber,
      orderType: orderType ?? (resolvedTableId === 'takeaway' ? 'Take Away' : 'Dine In'),
      customerName: customerName?.trim() || 'Walk-in',
      status: status ?? 'InKitchen',
      items: enrichedItems,
      subtotal,
      tax,
      donation,
      total,
      paymentMethod: paymentMethod ?? 'Cash',
    });

    return NextResponse.json(serializeDoc(created), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
