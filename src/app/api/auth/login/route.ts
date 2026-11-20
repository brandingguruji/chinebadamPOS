import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { ensureSeeded } from '@/lib/seed';
import { UserModel } from '@/lib/models';
import { signToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    await ensureSeeded();
    const body = await request.json();
    const { username, password } = body as { username: string; password: string };

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const user = await UserModel.findOne({ username });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcryptjs.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const userId = String(user._id);
    const token = await signToken({ userId, username: user.username, role: user.role });

    return NextResponse.json({
      token,
      user: { id: userId, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Database or server error. Check MONGODB_URI.' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
