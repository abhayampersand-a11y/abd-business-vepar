import { db } from '@/db';
import { itemCategories, items } from '@/db/schema';
import { eq, asc, sql, and } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, created } from '@/server/http';
import { itemCategorySchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const rows = await db
    .select({
      id: itemCategories.id,
      name: itemCategories.name,
      firmId: itemCategories.firmId,
      itemCount: sql<number>`count(${items.id})::int`,
    })
    .from(itemCategories)
    .leftJoin(items, eq(items.categoryId, itemCategories.id))
    .where(eq(itemCategories.firmId, firmId))
    .groupBy(itemCategories.id)
    .orderBy(asc(itemCategories.name));
  return ok(rows);
});

export const POST = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const body = itemCategorySchema.parse(await request.json());
  const [row] = await db.insert(itemCategories).values({ ...body, firmId }).returning();
  return created(row);
});

export const DELETE = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const id = Number(new URL(request.url).searchParams.get('id'));
  await db
    .delete(itemCategories)
    .where(and(eq(itemCategories.id, id), eq(itemCategories.firmId, firmId)));
  return ok({ id });
});
