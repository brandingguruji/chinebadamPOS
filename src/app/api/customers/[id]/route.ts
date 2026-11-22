import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { serializeDoc } from '@/lib/seed';
import { CustomerModel } from '@/lib/models';
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
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) {
        return NextResponse.json({ error: 'Customer name must be at least 2 characters' }, { status: 400 });
      }
      updateData.name = name;
    }
    if (body.phone !== undefined) {
      const phone = String(body.phone).trim();
      if (phone.length < 7) {
        return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 });
      }
      updateData.phone = phone;
    }
    if (body.email !== undefined) updateData.email = String(body.email).trim();
    if (body.totalOrders !== undefined) updateData.totalOrders = Math.max(0, Number(body.totalOrders) || 0);
    if (body.totalSpent !== undefined) updateData.totalSpent = Math.max(0, Number(body.totalSpent) || 0);

    const updated = await CustomerModel.findByIdAndUpdate(params.id, updateData, { new: true });
    if (!updated) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    return NextResponse.json(serializeDoc(updated));
  } catch {
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const deleted = await CustomerModel.findByIdAndDelete(params.id);
  if (!deleted) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  return NextResponse.json({ message: 'Customer deleted' });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
