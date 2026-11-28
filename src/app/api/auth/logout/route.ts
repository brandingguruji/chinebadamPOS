import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const isHttps =
    request.nextUrl.protocol === 'https:' ||
    request.headers.get('x-forwarded-proto') === 'https';
  const res = NextResponse.json({ ok: true });
  res.cookies.set('chinebadam_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: isHttps,
  });
  return res;
}
