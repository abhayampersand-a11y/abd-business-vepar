import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/server/session';

/**
 * Optimistic auth gate (Next 16 renamed Middleware to Proxy).
 *
 * This only reads and verifies the cookie — it never touches the database,
 * because it runs on every navigation including prefetches. The real check
 * lives in `requireUser()`, which every `/api` route goes through.
 */

const PUBLIC_ROUTES = new Set(['/login', '/register']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.has(pathname);
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session && !isPublic) {
    const url = new URL('/login', request.nextUrl);
    // Remember where they were headed so login can send them back.
    if (pathname !== '/') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // `/api` is left out: those routes authenticate themselves and must answer
  // with a 401 the client can handle, not a redirect to an HTML page.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
