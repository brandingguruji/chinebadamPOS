import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { ensureSeeded } from '@/lib/seed';
import { UserModel } from '@/lib/models';
import { signToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    await ensureSeeded();
    const body = await request.json();
    const identifier = String(body.username ?? body.email ?? '').trim();
    const password = String(body.password ?? '');

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/Username and password are required' }, { status: 400 });
    }

    const lower = identifier.toLowerCase();
    const user = await UserModel.findOne({
      $or: [{ username: identifier }, { email: lower }, { email: identifier }],
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcryptjs.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const userId = String(user._id);
    const token = await signToken({ userId, username: user.username, role: user.role });

    const res = NextResponse.json({
      token,
      user: { id: userId, username: user.username, email: user.email || '', role: user.role },
    });
    res.cookies.set('chinebadam_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
      secure: request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https',
    });
    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Database or server error. Check MONGODB_URI.' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
