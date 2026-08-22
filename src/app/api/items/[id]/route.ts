import { db } from '@/db';
import { items, transactionItems, transactions, stockAdjustments } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, fail } from '@/server/http';
import { itemSchema } from '@/lib/validators';
import { num, round3 } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (request: Request, { params }: Ctx) => {
  const firmId = await getActiveFirmId(request);
  const id = Number((await params).id);

  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.firmId, firmId)))
    .limit(1);
  if (!item) return fail('Item not found', 404);

  const lines = await db
    .select({
      line: transactionItems,
      txn: transactions,
    })
    .from(transactionItems)
    .innerJoin(transactions, eq(transactionItems.txnId, transactions.id))
    .where(and(eq(transactionItems.itemId, id), eq(transactions.firmId, firmId)))
    .orderBy(desc(transactions.txnDate), desc(transactions.id));

  const adjustments = await db
    .select()
    .from(stockAdjustments)
    .where(and(eq(stockAdjustments.itemId, id), eq(stockAdjustments.firmId, firmId)))
    .orderBy(desc(stockAdjustments.adjustmentDate));

  return ok({
    ...item,
    transactions: lines.map((r) => ({
      txnId: r.txn.id,
      txnType: r.txn.txnType,
      txnNo: r.txn.txnNo,
      txnDate: r.txn.txnDate,
      partyName: r.txn.partyName,
      status: r.txn.status,
      quantity: r.line.quantity,
      unit: r.line.unit,
      pricePerUnit: r.line.pricePerUnit,
      total: r.line.total,
    })),
    adjustments,
  });
});

export const PUT = handler(async (request: Request, { params }: Ctx) => {
  const firmId = await getActiveFirmId(request);
  const id = Number((await params).id);
  const body = itemSchema.parse(await request.json());

  const [existing] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.firmId, firmId)))
    .limit(1);
  if (!existing) return fail('Item not found', 404);

  // Editing the opening stock shifts the current quantity by the difference.
  const newOpening = body.type === 'service' ? 0 : num(body.openingStock);
  const stockQty = round3(num(existing.stockQty) - num(existing.openingStock) + newOpening);

  const [row] = await db
    .update(items)
    .set({
      name: body.name,
      type: body.type,
      itemCode: body.itemCode ?? null,
      hsnSac: body.hsnSac ?? null,
      categoryId: body.categoryId,
      unitId: body.unitId,
      description: body.description ?? null,
      salePrice: String(num(body.salePrice)),
      salePriceTaxInclusive: body.salePriceTaxInclusive ?? existing.salePriceTaxInclusive,
      purchasePrice: String(num(body.purchasePrice)),
      purchasePriceTaxInclusive:
        body.purchasePriceTaxInclusive ?? existing.purchasePriceTaxInclusive,
      taxRate: String(num(body.taxRate)),
      discountType: body.discountType ?? 'percent',
      discountValue: String(num(body.discountValue)),
      openingStock: String(newOpening),
      openingStockPrice: String(num(body.openingStockPrice)),
      openingStockDate: body.openingStockDate ?? null,
      stockQty: String(stockQty),
      minStockLevel: String(num(body.minStockLevel)),
      location: body.location ?? null,
      isActive: body.isActive ?? existing.isActive,
    })
    .where(eq(items.id, id))
    .returning();

  return ok(row);
});

export const DELETE = handler(async (request: Request, { params }: Ctx) => {
  const firmId = await getActiveFirmId(request);
  const id = Number((await params).id);

  const used = await db
    .select({ id: transactionItems.id })
    .from(transactionItems)
    .where(eq(transactionItems.itemId, id))
    .limit(1);
  if (used.length) {
    return fail('This item is used in transactions. Mark it inactive instead of deleting.', 409);
  }

  await db.delete(items).where(and(eq(items.id, id), eq(items.firmId, firmId)));
  return ok({ id });
});
