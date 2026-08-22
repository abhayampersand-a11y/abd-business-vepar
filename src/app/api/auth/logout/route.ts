import { handler, ok } from '@/server/http';
import { destroySession } from '@/server/session';

export const dynamic = 'force-dynamic';

export const POST = handler(async () => {
  await destroySession();
  return ok({ ok: true });
}, { public: true });
