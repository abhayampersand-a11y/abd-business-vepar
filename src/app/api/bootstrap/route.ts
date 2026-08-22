import { db } from '@/db';
import { firms, units, itemCategories, expenseCategories, settings } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

/**
 * One call that hands the client everything it needs before the first screen
 * paints — this is what lets the Redux store answer most lookups offline.
 */
export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);

  const [firmRows, allFirms, unitRows, itemCatRows, expCatRows, settingRows] = await Promise.all([
    db.select().from(firms).where(eq(firms.id, firmId)).limit(1),
    db.select().from(firms).orderBy(asc(firms.id)),
    db.select().from(units).where(eq(units.firmId, firmId)).orderBy(asc(units.name)),
    db
      .select()
      .from(itemCategories)
      .where(eq(itemCategories.firmId, firmId))
      .orderBy(asc(itemCategories.name)),
    db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.firmId, firmId))
      .orderBy(asc(expenseCategories.name)),
    db.select().from(settings).where(eq(settings.firmId, firmId)),
  ]);

  return ok({
    firm: firmRows[0] ?? null,
    firms: allFirms,
    units: unitRows,
    itemCategories: itemCatRows,
    expenseCategories: expCatRows,
    settings: Object.fromEntries(settingRows.map((s) => [s.key, s.value])),
  });
});
