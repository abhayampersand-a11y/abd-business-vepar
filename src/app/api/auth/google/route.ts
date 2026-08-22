import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { handler, fail } from '@/server/http';
import { randomToken } from '@/server/session';
import {
  authorizationUrl,
  googleConfigured,
  safeNextPath,
  OAUTH_STATE_COOKIE,
  OAUTH_NEXT_COOKIE,
} from '@/server/google';

export const dynamic = 'force-dynamic';

/** Step one: stash a CSRF token and bounce the browser to Google. */
export const GET = handler(async (request: Request) => {
  if (!googleConfigured()) {
    return fail('Google sign-in is not configured on this server.', 501);
  }

  const state = randomToken();
  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });

  // Where to land afterwards, remembered across the round trip to Google.
  const next = safeNextPath(new URL(request.url).searchParams.get('next'));
  store.set(OAUTH_NEXT_COOKIE, next, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(authorizationUrl(state, request.url));
}, { public: true });
