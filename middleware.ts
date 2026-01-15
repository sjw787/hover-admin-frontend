import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the access token from cookies or check for it
  // Since we're using localStorage on client side, we need to handle this differently
  // We'll let the client-side handle auth checks, but we can still redirect based on paths

  const isLoginPage = pathname === '/login';
  const isPublicPath = pathname === '/login';

  // If trying to access login while already having a session (handled client-side)
  // For now, we'll just ensure the middleware allows the routes

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};

