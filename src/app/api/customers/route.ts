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

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const docs = await CustomerModel.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(docs.map(serializeDoc));
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const email = String(body.email ?? '').trim();
    const totalOrders = Number(body.totalOrders ?? 0);
    const totalSpent = Number(body.totalSpent ?? 0);

    if (name.length < 2) {
      return NextResponse.json({ error: 'Customer name must be at least 2 characters' }, { status: 400 });
    }
    if (phone.length < 7) {
      return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 });
    }

    const created = await CustomerModel.create({
      name,
      phone,
      email,
      totalOrders: Number.isNaN(totalOrders) ? 0 : Math.max(0, totalOrders),
      totalSpent: Number.isNaN(totalSpent) ? 0 : Math.max(0, totalSpent),
      lastVisit: new Date(),
    });
    return NextResponse.json(serializeDoc(created), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
