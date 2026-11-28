import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { verifyToken, signToken } from '@/lib/jwt';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    await connectDB();

    const user =
      (await UserModel.findById(payload.userId).catch(() => null)) ||
      (await UserModel.findOne({ username: payload.username }));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const token = authHeader.slice(7);
    const isHttps =
      request.nextUrl.protocol === 'https:' ||
      request.headers.get('x-forwarded-proto') === 'https';
    const res = NextResponse.json({
      id: String(user._id),
      username: user.username,
      email: user.email || '',
      role: user.role,
    });
    res.cookies.set('chinebadam_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
      secure: isHttps,
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    await connectDB();

    const user =
      (await UserModel.findById(payload.userId).catch(() => null)) ||
      (await UserModel.findOne({ username: payload.username }));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const newUsername = body.username !== undefined ? String(body.username).trim() : user.username;
    const newEmail = body.email !== undefined ? String(body.email).trim().toLowerCase() : (user.email || '');
    const currentPassword = String(body.currentPassword ?? '');
    const newPassword = String(body.newPassword ?? '');

    if (newUsername.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Check username uniqueness
    if (newUsername !== user.username) {
      const conflict = await UserModel.findOne({ username: newUsername, _id: { $ne: user._id } });
      if (conflict) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
      }
    }

    // Check email uniqueness if provided
    if (newEmail && newEmail !== user.email) {
      const emailConflict = await UserModel.findOne({ email: newEmail, _id: { $ne: user._id } });
      if (emailConflict) {
        return NextResponse.json({ error: 'Email is already in use' }, { status: 409 });
      }
    }

    // Password change validation
    let passwordHash = user.passwordHash;
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 });
      }
      const valid = await bcryptjs.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
      }
      passwordHash = await bcryptjs.hash(newPassword, 10);
    }

    user.username = newUsername;
    user.email = newEmail;
    user.passwordHash = passwordHash;
    await user.save();

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
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
