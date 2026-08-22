import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Stateless sessions: a signed cookie, no session table.
 *
 * This module deliberately imports nothing from `@/db` — `proxy.ts` pulls it in
 * on every request to do its optimistic check, and dragging a database pool
 * into that path would open a connection for requests that never query.
 */

export const SESSION_COOKIE = 'vyapar_session';

/** Seven days, matching the cookie's Max-Age. */
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type SessionPayload = {
  /** users.id */
  uid: number;
  /** Unix seconds. */
  exp: number;
};

function secret(): Buffer {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error(
      'SESSION_SECRET is not set — generate one with `openssl rand -base64 32` and add it to .env.',
    );
  }
  return Buffer.from(value, 'utf8');
}

const b64url = (buf: Buffer) => buf.toString('base64url');

function sign(data: string): string {
  return b64url(createHmac('sha256', secret()).update(data).digest());
}

export function signSessionToken(uid: number): string {
  const payload: SessionPayload = {
    uid,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  return `${body}.${sign(body)}`;
}

/**
 * Verifies signature and expiry. Returns null on anything suspicious rather
 * than throwing, so callers can treat "bad cookie" and "no cookie" alike.
 */
export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;

  const dot = token.indexOf('.');
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const provided = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(body));

  // timingSafeEqual throws on a length mismatch, so guard it first.
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.uid !== 'number' || typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(uid: number): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSessionToken(uid), {
    httpOnly: true,
    // Vercel is always https; plain http localhost would reject a secure cookie.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Signature-and-expiry check only — no database round trip. */
export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Opaque value for the Google OAuth `state` parameter (CSRF defence). */
export const randomToken = () => randomBytes(16).toString('hex');
