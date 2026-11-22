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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const existing = await BulkOrderModel.findById(params.id);
    if (!existing) return NextResponse.json({ error: 'Bulk order not found' }, { status: 404 });

    const body = await request.json();
    const totalPrice = body.totalPrice !== undefined ? Number(body.totalPrice) : Number(existing.totalPrice);
    const advancePaid = body.advancePaid !== undefined ? Math.max(0, Number(body.advancePaid) || 0) : Number(existing.advancePaid || 0);
    const balanceDue = Math.max(0, parseFloat((totalPrice - advancePaid).toFixed(2)));

    const updateData: Record<string, unknown> = {
      totalPrice,
      advancePaid,
      balanceDue,
    };

    if (body.customerName !== undefined) updateData.customerName = String(body.customerName).trim();
    if (body.phone !== undefined) updateData.phone = String(body.phone).trim();
    if (body.eventType !== undefined) updateData.eventType = String(body.eventType).trim();
    if (body.menuDetails !== undefined) updateData.menuDetails = String(body.menuDetails).trim();
    if (body.peopleCount !== undefined) updateData.peopleCount = Math.max(1, Number(body.peopleCount) || 1);
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod;
    if (body.orderDate !== undefined) updateData.orderDate = String(body.orderDate).trim();
    if (body.deliveryDate !== undefined) updateData.deliveryDate = String(body.deliveryDate).trim();
    if (body.deliveryTime !== undefined) updateData.deliveryTime = String(body.deliveryTime).trim();
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = String(body.notes).trim();

    const updated = await BulkOrderModel.findByIdAndUpdate(params.id, updateData, { new: true });
    return NextResponse.json(serializeDoc(updated));
  } catch {
    return NextResponse.json({ error: 'Failed to update bulk order' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const deleted = await BulkOrderModel.findByIdAndDelete(params.id);
  if (!deleted) return NextResponse.json({ error: 'Bulk order not found' }, { status: 404 });
  return NextResponse.json({ message: 'Bulk order deleted' });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
