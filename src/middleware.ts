import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/orders',
  '/order-line',
  '/bulk-orders',
  '/manage-tables',
  '/manage-dishes',
  '/categories',
  '/customers',
  '/expenses',
  '/stocks',
  '/reports',
  '/settings',
  '/profile',
  '/help',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get('chinebadam_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/pos', request.url));
  }

  try {
    await verifyToken(token);
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL('/pos', request.url));
    res.cookies.set('chinebadam_token', '', { path: '/', maxAge: 0 });
    return res;
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/orders/:path*',
    '/order-line/:path*',
    '/bulk-orders/:path*',
    '/manage-tables/:path*',
    '/manage-dishes/:path*',
    '/categories/:path*',
    '/customers/:path*',
    '/expenses/:path*',
    '/stocks/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/help/:path*',
  ],
};
