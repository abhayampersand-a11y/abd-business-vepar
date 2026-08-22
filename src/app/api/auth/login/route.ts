import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { handler, ok, fail } from '@/server/http';
import { verifyPassword, publicUser } from '@/server/auth';
import { createSession } from '@/server/session';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.email('Please enter a valid email address.').trim().toLowerCase(),
  password: z.string().min(1, 'Please enter your password.'),
});

export const POST = handler(async (request: Request) => {
  const { email, password } = schema.parse(await request.json());

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // One message for both "no such user" and "wrong password", so the response
  // cannot be used to discover which emails have accounts.
  const invalid = fail('Email or password is incorrect.', 401);
  if (!user) return invalid;

  if (!user.passwordHash) {
    return fail('This account was created with Google — use "Continue with Google".', 401);
  }
  if (!(await verifyPassword(password, user.passwordHash))) return invalid;

  await createSession(user.id);
  return ok({ user: publicUser(user) });
}, { public: true });
