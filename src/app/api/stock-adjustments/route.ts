import { db } from '@/db';
import { stockAdjustments, items } from '@/db/schema';
import { and, eq, desc, sql } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, created, fail } from '@/server/http';
import { stockAdjustmentSchema } from '@/lib/validators';
import { num, round3 } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const itemId = new URL(request.url).searchParams.get('itemId');

  const where = [eq(stockAdjustments.firmId, firmId)];
  if (itemId) where.push(eq(stockAdjustments.itemId, Number(itemId)));

  const rows = await db
    .select({ adj: stockAdjustments, itemName: items.name })
    .from(stockAdjustments)
    .leftJoin(items, eq(stockAdjustments.itemId, items.id))
    .where(and(...where))
    .orderBy(desc(stockAdjustments.adjustmentDate), desc(stockAdjustments.id));

  return ok(rows.map((r) => ({ ...r.adj, itemName: r.itemName })));
});

export const POST = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const body = stockAdjustmentSchema.parse(await request.json());

  return db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(items)
      .where(and(eq(items.id, body.itemId), eq(items.firmId, firmId)))
      .limit(1);
    if (!item) return fail('Item not found', 404);

    const qty = round3(Math.abs(num(body.quantity)));
    const delta = body.type === 'add' ? qty : -qty;

    const [row] = await tx
      .insert(stockAdjustments)
      .values({
        firmId,
        itemId: body.itemId,
        type: body.type,
        quantity: String(qty),
        atPrice: String(num(body.atPrice)),
        adjustmentDate: body.adjustmentDate,
        details: body.details ?? null,
      })
      .returning();

    await tx
      .update(items)
      .set({ stockQty: sql`${items.stockQty} + ${delta}` })
      .where(eq(items.id, body.itemId));

    return created(row);
  });
});

export const DELETE = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const id = Number(new URL(request.url).searchParams.get('id'));

  return db.transaction(async (tx) => {
    const [adj] = await tx
      .select()
      .from(stockAdjustments)
      .where(and(eq(stockAdjustments.id, id), eq(stockAdjustments.firmId, firmId)))
      .limit(1);
    if (!adj) return fail('Adjustment not found', 404);

    // Reverse the quantity this adjustment applied.
    const delta = adj.type === 'add' ? -num(adj.quantity) : num(adj.quantity);
    await tx
      .update(items)
      .set({ stockQty: sql`${items.stockQty} + ${delta}` })
      .where(eq(items.id, adj.itemId));

    await tx.delete(stockAdjustments).where(eq(stockAdjustments.id, id));
    return ok({ id });
  });
});
