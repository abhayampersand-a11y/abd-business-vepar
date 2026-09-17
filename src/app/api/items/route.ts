import { db } from '@/db';
import { items, itemCategories, units } from '@/db/schema';
import { and, eq, asc, ilike, or } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, created } from '@/server/http';
import { itemSchema } from '@/lib/validators';
import { num } from '@/lib/format';
import { reserveItemId, resolveItemCode } from '@/server/item-code';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const url = new URL(request.url);
  const search = url.searchParams.get('search');
  const type = url.searchParams.get('type');
  const categoryId = url.searchParams.get('categoryId');
  const activeOnly = url.searchParams.get('active');

  const where = [eq(items.firmId, firmId)];
  if (search) {
    const q = `%${search}%`;
    const clause = or(ilike(items.name, q), ilike(items.itemCode, q), ilike(items.hsnSac, q));
    if (clause) where.push(clause);
  }
  if (type === 'product' || type === 'service') where.push(eq(items.type, type));
  if (categoryId) where.push(eq(items.categoryId, Number(categoryId)));
  if (activeOnly === 'true') where.push(eq(items.isActive, true));

  const rows = await db
    .select({
      item: items,
      categoryName: itemCategories.name,
      unitShort: units.shortName,
    })
    .from(items)
    .leftJoin(itemCategories, eq(items.categoryId, itemCategories.id))
    .leftJoin(units, eq(items.unitId, units.id))
    .where(and(...where))
    .orderBy(asc(items.name));

  return ok(
    rows.map((r) => ({
      ...r.item,
      categoryName: r.categoryName,
      unitShort: r.unitShort ?? 'Pcs',
    })),
  );
});

export const POST = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const body = itemSchema.parse(await request.json());

  // Services carry no stock, so the opening quantity is forced to zero.
  const opening = body.type === 'service' ? 0 : num(body.openingStock);

  const row = await db.transaction(async (tx) => {
    // The id is taken first so a blank code can become ITM<id> in this insert.
    const id = await reserveItemId(tx);
    const itemCode = await resolveItemCode(tx, firmId, body.itemCode, id);

    const [inserted] = await tx
      .insert(items)
      .values({
        id,
        firmId,
        name: body.name,
        type: body.type,
        itemCode,
        hsnSac: body.hsnSac ?? null,
        categoryId: body.categoryId,
        unitId: body.unitId,
        description: body.description ?? null,
        salePrice: String(num(body.salePrice)),
        salePriceTaxInclusive: body.salePriceTaxInclusive ?? false,
        purchasePrice: String(num(body.purchasePrice)),
        purchasePriceTaxInclusive: body.purchasePriceTaxInclusive ?? false,
        taxRate: String(num(body.taxRate)),
        discountType: body.discountType ?? 'percent',
        discountValue: String(num(body.discountValue)),
        openingStock: String(opening),
        openingStockPrice: String(num(body.openingStockPrice)),
        openingStockDate: body.openingStockDate ?? null,
        stockQty: String(opening),
        minStockLevel: String(num(body.minStockLevel)),
        location: body.location ?? null,
      })
      .returning();
    return inserted;
  });

  return created(row);
});
