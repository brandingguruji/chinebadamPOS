import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { ensureSeeded } from '@/lib/seed';
import { UserModel } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    await ensureSeeded();

    const user = await UserModel.findOne({ username: payload.username });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ id: String(user._id), username: user.username, role: user.role });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
