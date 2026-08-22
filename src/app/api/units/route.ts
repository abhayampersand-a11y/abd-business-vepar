import { db } from '@/db';
import { units } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, created } from '@/server/http';
import { unitSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  return ok(await db.select().from(units).where(eq(units.firmId, firmId)).orderBy(asc(units.name)));
});

export const POST = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const body = unitSchema.parse(await request.json());
  const [row] = await db.insert(units).values({ ...body, firmId }).returning();
  return created(row);
});
