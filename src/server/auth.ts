import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, type User } from '@/db/schema';
import { readSession } from './session';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;

/** Thrown by `requireUser`; `handler` turns it into a 401. */
export class UnauthorizedError extends Error {
  constructor(message = 'Please sign in to continue.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * scrypt rather than bcrypt: it ships with Node, so there is no native module
 * to rebuild on the deploy host.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;

  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const derived = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** The signed-in user, or null. Verifies the cookie *and* that the row exists. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await readSession();
  if (!session) return null;

  const rows = await db.select().from(users).where(eq(users.id, session.uid)).limit(1);
  return rows[0] ?? null;
}

/**
 * The choke point every protected route goes through. Checking here — next to
 * the data — rather than relying on `proxy.ts` is what actually secures the
 * API, since proxy only ever sees the cookie.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** What we let the client see. Never the password hash. */
export const publicUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
});

export type PublicUser = ReturnType<typeof publicUser>;
