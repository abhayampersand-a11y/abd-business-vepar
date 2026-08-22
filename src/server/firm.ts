import { db } from '@/db';
import { firms, units, expenseCategories, settings } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { DEFAULT_UNITS, DEFAULT_EXPENSE_CATEGORIES } from '@/lib/constants';
import { toISODate } from '@/lib/format';

/**
 * Resolves the firm a request is operating on.
 *
 * The app is single-tenant per database, so we fall back to the default firm
 * and bootstrap one (with Vyapar's stock units and expense heads) the first
 * time the app is opened.
 */
export async function getActiveFirmId(request?: Request): Promise<number> {
  const header = request?.headers.get('x-firm-id');
  if (header) {
    const id = Number(header);
    if (Number.isInteger(id) && id > 0) {
      const found = await db.select({ id: firms.id }).from(firms).where(eq(firms.id, id)).limit(1);
      if (found.length) return found[0].id;
    }
  }
  return ensureDefaultFirm();
}

let bootstrapPromise: Promise<number> | null = null;

export function ensureDefaultFirm(): Promise<number> {
  bootstrapPromise ??= bootstrap().finally(() => {
    // Allow a later retry if bootstrapping failed.
    setTimeout(() => {
      bootstrapPromise = null;
    }, 5_000);
  });
  return bootstrapPromise;
}

async function bootstrap(): Promise<number> {
  const existing = await db.select().from(firms).orderBy(asc(firms.id)).limit(1);
  if (existing.length) return existing[0].id;

  const [firm] = await db
    .insert(firms)
    .values({
      name: 'My Company',
      isDefault: true,
      booksBeginDate: toISODate(),
    })
    .returning();

  await db.insert(units).values(DEFAULT_UNITS.map((u) => ({ ...u, firmId: firm.id })));
  await db
    .insert(expenseCategories)
    .values(DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, firmId: firm.id })));
  await db.insert(settings).values([
    { firmId: firm.id, key: 'gst_enabled', value: 'true' },
    { firmId: firm.id, key: 'round_off_enabled', value: 'true' },
    { firmId: firm.id, key: 'stock_enabled', value: 'true' },
    { firmId: firm.id, key: 'currency_symbol', value: '₹' },
  ]);

  return firm.id;
}
