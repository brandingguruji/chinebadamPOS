import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { serializeDoc } from '@/lib/seed';
import { OrderQueryModel, OrderModel, StoreSettingsModel } from '@/lib/models';
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

// POST /api/order-queries/[id] -> Convert query into a paid Order
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const queryDoc = await OrderQueryModel.findById(params.id);
    if (!queryDoc) {
      return NextResponse.json({ error: 'Order query not found' }, { status: 404 });
    }
    if (queryDoc.status === 'Converted') {
      return NextResponse.json({ error: 'Already converted to an order' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const paymentMethod = body.paymentMethod || 'Scan';
    const orderStatus = body.status || 'Served';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: any = await StoreSettingsModel.findOne({ key: 'store_settings' }).lean();
    const taxRate = settings?.taxRate !== undefined ? Number(settings.taxRate) : 5;

    const subtotal = parseFloat(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (queryDoc.items || []).reduce((s: number, i: any) => s + Number(i.unitPrice || 0) * Number(i.quantity || 1), 0).toFixed(2)
    );
    const tax = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    const orderCount = await OrderModel.countDocuments();
    const orderNumber = `#F${String(orderCount + 27).padStart(4, '0')}`;

    const customerLabel = queryDoc.phone
      ? `${queryDoc.customerName || 'Online'} (${queryDoc.phone})`
      : queryDoc.customerName || 'Online Customer';

    const createdOrder = await OrderModel.create({
      orderNumber,
      tableId: 'takeaway',
      tableNumber: 0,
      orderType: queryDoc.orderType === 'Dine In' ? 'Dine In' : 'Take Away',
      customerName: customerLabel,
      status: orderStatus,
      paymentStatus: 'Paid',
      items: queryDoc.items || [],
      subtotal,
      tax,
      donation: 0,
      total,
      paymentMethod,
      sourceQueryNumber: queryDoc.queryNumber,
    });

    queryDoc.status = 'Converted';
    queryDoc.convertedOrderId = String(createdOrder._id);
    await queryDoc.save();

    return NextResponse.json({
      order: serializeDoc(createdOrder),
      query: serializeDoc(queryDoc),
    }, { status: 201 });
  } catch (err) {
    console.error('Convert OrderQuery error:', err);
    return NextResponse.json({ error: 'Failed to convert order query' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const deleted = await OrderQueryModel.findByIdAndDelete(params.id);
  if (!deleted) {
    return NextResponse.json({ error: 'Order query not found' }, { status: 404 });
  }
  return NextResponse.json({ message: 'Order query deleted' });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
