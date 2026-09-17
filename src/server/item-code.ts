import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { items } from '@/db/schema';
import { autoItemCode, normalizeItemCode } from '@/lib/item-code';

/** `db` itself or the handle inside `db.transaction`. */
type Executor = Pick<typeof db, 'select' | 'execute'>;

export class ItemCodeTakenError extends Error {}

/** The item in this firm already holding `code`, compared ignoring case. */
export async function findItemByCode(ex: Executor, firmId: number, code: string, excludeId?: number) {
  const where = [eq(items.firmId, firmId), sql`lower(${items.itemCode}) = lower(${code})`];
  if (excludeId) where.push(ne(items.id, excludeId));
  const [row] = await ex
    .select({ id: items.id, name: items.name })
    .from(items)
    .where(and(...where))
    .limit(1);
  return row ?? null;
}

/**
 * Reserves the id a new item will be inserted with, so its generated code can
 * be written in the same insert instead of patched in afterwards.
 */
export async function reserveItemId(ex: Executor): Promise<number> {
  const result = await ex.execute<{ id: number }>(
    sql`select nextval(pg_get_serial_sequence('items', 'id'))::int as id`,
  );
  return result.rows[0].id;
}

/**
 * The code an item is saved with. A typed code must be free within the firm;
 * a blank one becomes ITM<id>, stepping aside if someone typed that by hand.
 * Every item ends up with a code, because every item can get a QR label.
 */
export async function resolveItemCode(
  ex: Executor,
  firmId: number,
  requested: string | null | undefined,
  itemId: number,
): Promise<string> {
  const code = normalizeItemCode(requested);
  if (code) {
    const clash = await findItemByCode(ex, firmId, code, itemId);
    if (clash) throw new ItemCodeTakenError(`Item code "${code}" is already used by ${clash.name}`);
    return code;
  }

  const base = autoItemCode(itemId);
  let candidate = base;
  for (let n = 2; await findItemByCode(ex, firmId, candidate, itemId); n++) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}
