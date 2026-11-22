import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { serializeDoc } from '@/lib/seed';
import { BulkOrderModel } from '@/lib/models';
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
  const docs = await BulkOrderModel.find().sort({ deliveryDate: 1, createdAt: -1 }).lean();
  return NextResponse.json(docs.map(serializeDoc));
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const body = await request.json();
    const customerName = String(body.customerName ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const eventType = String(body.eventType ?? 'Birthday').trim() || 'Birthday';
    const menuDetails = String(body.menuDetails ?? '').trim();
    const peopleCount = Number(body.peopleCount);
    const totalPrice = Number(body.totalPrice);
    const advancePaid = Math.max(0, Number(body.advancePaid) || 0);
    const orderDate = String(body.orderDate ?? '').trim() || new Date().toISOString().slice(0, 10);
    const deliveryDate = String(body.deliveryDate ?? '').trim();
    const deliveryTime = String(body.deliveryTime ?? '').trim();
    const paymentMethod = body.paymentMethod || 'Cash';
    const status = body.status || 'Booked';
    const notes = String(body.notes ?? '').trim();

    if (customerName.length < 2) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }
    if (phone.length < 7) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
    }
    if (!menuDetails) {
      return NextResponse.json({ error: 'Menu / package details are required' }, { status: 400 });
    }
    if (Number.isNaN(peopleCount) || peopleCount <= 0) {
      return NextResponse.json({ error: 'Total people must be at least 1' }, { status: 400 });
    }
    if (Number.isNaN(totalPrice) || totalPrice <= 0) {
      return NextResponse.json({ error: 'Total price must be greater than ₹0' }, { status: 400 });
    }
    if (!deliveryDate) {
      return NextResponse.json({ error: 'Delivery date is required' }, { status: 400 });
    }

    const balanceDue = Math.max(0, parseFloat((totalPrice - advancePaid).toFixed(2)));
    const count = await BulkOrderModel.countDocuments();
    const orderNumber = `#B${String(count + 101).padStart(4, '0')}`;

    const created = await BulkOrderModel.create({
      orderNumber,
      customerName,
      phone,
      eventType,
      menuDetails,
      peopleCount,
      totalPrice,
      advancePaid,
      balanceDue,
      paymentMethod,
      orderDate,
      deliveryDate,
      deliveryTime,
      status,
      notes,
    });

    return NextResponse.json(serializeDoc(created), { status: 201 });
  } catch (err) {
    console.error('BulkOrder POST error:', err);
    return NextResponse.json({ error: 'Failed to create bulk order' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
