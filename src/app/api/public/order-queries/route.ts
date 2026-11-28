import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { serializeDoc } from '@/lib/seed';
import { OrderQueryModel, DishModel } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    const allDishes = await DishModel.find().lean();
    const enrichedItems = items.map(
      (item: { dishId: string; dishName?: string; quantity: number; unitPrice?: number }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dish: any = allDishes.find((d: any) => String(d._id) === item.dishId);
        return {
          dishId: String(item.dishId || ''),
          dishName: String(item.dishName || dish?.name || 'Item'),
          quantity: Math.max(1, Number(item.quantity) || 1),
          unitPrice: Number(item.unitPrice ?? dish?.price ?? 0),
        };
      }
    );

    const subtotal = parseFloat(
      enrichedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2)
    );
    const tax = 0;
    const total = subtotal;

    const count = await OrderQueryModel.countDocuments();
    const queryNumber = `#Q${String(count + 101).padStart(4, '0')}`;

    const created = await OrderQueryModel.create({
      queryNumber,
      customerName: String(body.customerName ?? '').trim() || 'Online Customer',
      phone: String(body.phone ?? '').trim(),
      orderType: body.orderType || 'Take Away',
      note: String(body.note ?? '').trim(),
      items: enrichedItems,
      subtotal,
      tax,
      total,
      status: 'Pending',
    });

    return NextResponse.json(serializeDoc(created), { status: 201 });
  } catch (err) {
    console.error('Public OrderQuery POST error:', err);
    return NextResponse.json({ error: 'Failed to save order query' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
