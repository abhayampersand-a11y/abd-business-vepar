import { handler, ok } from '@/server/http';
import { getCurrentUser, publicUser } from '@/server/auth';

export const dynamic = 'force-dynamic';

/**
 * Public on purpose: it answers "who am I, if anyone" and the client uses the
 * null case to decide whether to show the app or bounce to /login.
 */
export const GET = handler(async () => {
  const user = await getCurrentUser();
  return ok({ user: user ? publicUser(user) : null });
}, { public: true });
