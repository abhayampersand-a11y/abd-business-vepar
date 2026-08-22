import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { handler } from '@/server/http';
import { createSession } from '@/server/session';
import {
  exchangeCodeForProfile,
  safeNextPath,
  OAUTH_STATE_COOKIE,
  OAUTH_NEXT_COOKIE,
} from '@/server/google';

export const dynamic = 'force-dynamic';

/** Sends the browser back to /login with a message it can render. */
function backToLogin(request: Request, message: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

/** Step two: verify state, swap the code for a profile, sign the user in. */
export const GET = handler(async (request: Request) => {
  const url = new URL(request.url);
  const store = await cookies();

  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;
  const next = safeNextPath(store.get(OAUTH_NEXT_COOKIE)?.value);
  store.delete(OAUTH_STATE_COOKIE);
  store.delete(OAUTH_NEXT_COOKIE);

  if (url.searchParams.get('error')) {
    return backToLogin(request, 'Google sign-in was cancelled.');
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || !expectedState || state !== expectedState) {
    return backToLogin(request, 'Google sign-in expired — please try again.');
  }

  let profile;
  try {
    profile = await exchangeCodeForProfile(code, request.url);
  } catch (err) {
    return backToLogin(request, err instanceof Error ? err.message : 'Google sign-in failed.');
  }

  // Match on the Google id first, then fall back to email so somebody who
  // registered with a password can also use the Google button.
  const [byGoogleId] = await db
    .select()
    .from(users)
    .where(eq(users.googleId, profile.sub))
    .limit(1);

  let user = byGoogleId;

  if (!user) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);

    if (byEmail) {
      [user] = await db
        .update(users)
        .set({ googleId: profile.sub, avatarUrl: byEmail.avatarUrl ?? profile.picture })
        .where(eq(users.id, byEmail.id))
        .returning();
    } else {
      [user] = await db
        .insert(users)
        .values({
          name: profile.name,
          email: profile.email,
          googleId: profile.sub,
          avatarUrl: profile.picture,
        })
        .returning();
    }
  }

  await createSession(user.id);
  return NextResponse.redirect(new URL(next, request.url));
}, { public: true });
