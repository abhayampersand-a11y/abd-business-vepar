import { db } from '@/db';
import { items, itemCategories, units } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, fail } from '@/server/http';
import { codeFromScan } from '@/lib/item-code';

export const dynamic = 'force-dynamic';

/**
 * Resolves a scanned code — or a whole label URL — to its item.
 * `GET /api/items/lookup?code=ITM00042`
 */
export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const code = codeFromScan(new URL(request.url).searchParams.get('code') ?? '');
  if (!code) return fail('Scan or type an item code', 400);

  const [row] = await db
    .select({
      item: items,
      categoryName: itemCategories.name,
      unitShort: units.shortName,
    })
    .from(items)
    .leftJoin(itemCategories, eq(items.categoryId, itemCategories.id))
    .leftJoin(units, eq(items.unitId, units.id))
    .where(and(eq(items.firmId, firmId), sql`lower(${items.itemCode}) = lower(${code})`))
    .limit(1);

  if (!row) return fail(`No item has the code "${code}"`, 404);

  return ok({ ...row.item, categoryName: row.categoryName, unitShort: row.unitShort ?? 'Pcs' });
});
