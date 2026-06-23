import { NextResponse } from 'next/server';

/**
 * Next.js route-protection middleware (placeholder).
 *
 * Auth currently lives client-side: the access token is held in memory /
 * localStorage and the refresh token is an HTTP-only cookie scoped to the API
 * origin (:4000), so it isn't visible to this middleware on the web origin
 * (:3000). Protected pages therefore guard themselves on the client (see
 * app/(dashboard)/dashboard/page.tsx, which redirects to /login).
 *
 * When server-side session reading is wired up (e.g. a same-origin session
 * cookie or a BFF proxy), enforce redirects for /dashboard and /admin here.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
