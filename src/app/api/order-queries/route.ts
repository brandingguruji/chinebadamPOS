import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { serializeDoc } from '@/lib/seed';
import { OrderQueryModel } from '@/lib/models';
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
  const status = searchParams.get('status');
  const query = status ? { status } : {};

  const docs = await OrderQueryModel.find(query).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json(docs.map(serializeDoc));
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
