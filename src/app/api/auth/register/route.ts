import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { handler, created, fail } from '@/server/http';
import { hashPassword, publicUser } from '@/server/auth';
import { createSession } from '@/server/session';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.'),
  email: z.email('Please enter a valid email address.').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const POST = handler(async (request: Request) => {
  const { name, email, password } = schema.parse(await request.json());

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length) {
    return fail('An account with that email already exists — sign in instead.', 409);
  }

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash: await hashPassword(password) })
    .returning();

  await createSession(user.id);
  return created({ user: publicUser(user) });
}, { public: true });
