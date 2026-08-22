import { db } from '@/db';
import { items, parties, units, itemCategories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, fail } from '@/server/http';
import { num } from '@/lib/format';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const importSchema = z.object({
  kind: z.enum(['items', 'parties']),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))).max(5000),
});

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

/**
 * Bulk import from a spreadsheet. Column names are matched loosely so a file
 * exported from Excel or Tally usually lands without hand-editing headers.
 */
export const POST = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const body = importSchema.parse(await request.json());

  const pick = (row: Record<string, unknown>, ...names: string[]) => {
    const keys = Object.keys(row);
    for (const name of names) {
      const key = keys.find(
        (k) => k.toLowerCase().replace(/[\s_./-]/g, '') === name.toLowerCase().replace(/[\s_./-]/g, ''),
      );
      if (key && str(row[key])) return str(row[key]);
    }
    return '';
  };

  const errors: Array<{ row: number; message: string }> = [];
  let imported = 0;

  if (body.kind === 'items') {
    const [unitRows, catRows] = await Promise.all([
      db.select().from(units).where(eq(units.firmId, firmId)),
      db.select().from(itemCategories).where(eq(itemCategories.firmId, firmId)),
    ]);

    for (const [i, row] of body.rows.entries()) {
      const name = pick(row, 'item name', 'name', 'product', 'item');
      if (!name) {
        errors.push({ row: i + 2, message: 'Missing item name' });
        continue;
      }

      const unitName = pick(row, 'unit', 'uom');
      const unit = unitRows.find(
        (u) =>
          u.shortName.toLowerCase() === unitName.toLowerCase() ||
          u.name.toLowerCase() === unitName.toLowerCase(),
      );

      const categoryName = pick(row, 'category', 'item category');
      let category = catRows.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
      if (categoryName && !category) {
        const [created] = await db
          .insert(itemCategories)
          .values({ firmId, name: categoryName })
          .returning();
        catRows.push(created);
        category = created;
      }

      const opening = num(pick(row, 'opening stock', 'stock', 'quantity', 'qty'));

      try {
        await db.insert(items).values({
          firmId,
          name,
          type: /service/i.test(pick(row, 'type')) ? 'service' : 'product',
          itemCode: pick(row, 'item code', 'code', 'sku') || null,
          hsnSac: pick(row, 'hsn', 'hsn code', 'sac', 'hsn/sac') || null,
          unitId: unit?.id ?? null,
          categoryId: category?.id ?? null,
          salePrice: String(num(pick(row, 'sale price', 'selling price', 'price'))),
          purchasePrice: String(num(pick(row, 'purchase price', 'cost price', 'cost'))),
          taxRate: String(num(pick(row, 'tax rate', 'gst', 'gst rate', 'tax'))),
          openingStock: String(opening),
          openingStockPrice: String(num(pick(row, 'opening stock price', 'at price'))),
          stockQty: String(opening),
          minStockLevel: String(num(pick(row, 'min stock', 'minimum stock', 'reorder level'))),
          location: pick(row, 'location', 'rack') || null,
        });
        imported++;
      } catch (err) {
        errors.push({ row: i + 2, message: err instanceof Error ? err.message : 'Insert failed' });
      }
    }
  } else {
    for (const [i, row] of body.rows.entries()) {
      const name = pick(row, 'party name', 'name', 'customer', 'supplier');
      if (!name) {
        errors.push({ row: i + 2, message: 'Missing party name' });
        continue;
      }

      // Skip a party that already exists rather than creating a duplicate.
      const existing = await db
        .select({ id: parties.id })
        .from(parties)
        .where(and(eq(parties.firmId, firmId), eq(parties.name, name)))
        .limit(1);
      if (existing.length) {
        errors.push({ row: i + 2, message: `"${name}" already exists — skipped` });
        continue;
      }

      const balanceRaw = pick(row, 'opening balance', 'balance');
      const typeRaw = pick(row, 'balance type', 'type');
      const toPay = /pay/i.test(typeRaw) || num(balanceRaw) < 0;
      const opening = Math.abs(num(balanceRaw));

      try {
        await db.insert(parties).values({
          firmId,
          name,
          phone: pick(row, 'phone', 'mobile', 'contact', 'phone number') || null,
          email: pick(row, 'email') || null,
          gstin: pick(row, 'gstin', 'gst no', 'gst number') || null,
          partyType: /supplier|vendor/i.test(pick(row, 'party type')) ? 'supplier' : 'customer',
          billingAddress: pick(row, 'address', 'billing address') || null,
          state: pick(row, 'state') || null,
          partyGroup: pick(row, 'group', 'party group') || 'General',
          openingBalance: String(opening),
          openingBalanceType: toPay ? 'to_pay' : 'to_receive',
          balance: String(toPay ? -opening : opening),
        });
        imported++;
      } catch (err) {
        errors.push({ row: i + 2, message: err instanceof Error ? err.message : 'Insert failed' });
      }
    }
  }

  if (!imported && errors.length === body.rows.length) {
    return fail('Nothing could be imported — check the column headings.', 422, { errors });
  }

  return ok({ imported, skipped: errors.length, errors: errors.slice(0, 50) });
});
