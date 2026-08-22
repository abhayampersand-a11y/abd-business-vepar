import { db } from '@/db';
import {
  transactions,
  transactionItems,
  parties,
  items,
  itemCategories,
  expenseCategories,
} from '@/db/schema';
import { and, eq, sql, gte, lte, inArray, desc, asc, ne, gt, type AnyColumn } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, fail } from '@/server/http';
import { num, round2, resolveDateRange, toISODate, type DateRangeKey } from '@/lib/format';
import { TXN_META } from '@/lib/constants';
import type { TxnType } from '@/db/schema';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string }> };

export const GET = handler(async (request: Request, { params }: Ctx) => {
  const firmId = await getActiveFirmId(request);
  const { slug } = await params;
  const url = new URL(request.url);

  const rangeKey = (url.searchParams.get('range') ?? 'this_month') as DateRangeKey;
  const preset = resolveDateRange(rangeKey);
  const from = url.searchParams.get('from') || preset.from;
  const to = url.searchParams.get('to') || preset.to;
  const partyId = url.searchParams.get('partyId');
  const period = and(gte(transactions.txnDate, from), lte(transactions.txnDate, to));
  const scope = and(eq(transactions.firmId, firmId), period);

  switch (slug) {
    /* ---------------------------------------------------------------- */
    case 'day-book': {
      const rows = await db
        .select()
        .from(transactions)
        .where(scope)
        .orderBy(asc(transactions.txnDate), asc(transactions.id));

      let moneyIn = 0;
      let moneyOut = 0;
      for (const r of rows) {
        const sign = TXN_META[r.txnType].cashSign;
        const amount = num(r.receivedAmount) * sign;
        if (amount > 0) moneyIn += amount;
        else moneyOut += Math.abs(amount);
      }

      return ok({
        rows: rows.map((r) => ({
          ...r,
          label: TXN_META[r.txnType].label,
          moneyIn: TXN_META[r.txnType].cashSign > 0 ? num(r.receivedAmount) : 0,
          moneyOut: TXN_META[r.txnType].cashSign < 0 ? num(r.receivedAmount) : 0,
        })),
        summary: { moneyIn: round2(moneyIn), moneyOut: round2(moneyOut) },
        range: { from, to },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'all-transactions': {
      const typeParam = url.searchParams.get('type');
      const where = [scope];
      if (typeParam && typeParam !== 'all') {
        where.push(inArray(transactions.txnType, typeParam.split(',') as TxnType[]));
      }
      if (partyId) where.push(eq(transactions.partyId, Number(partyId)));

      const rows = await db
        .select({ txn: transactions, party: parties.name })
        .from(transactions)
        .leftJoin(parties, eq(transactions.partyId, parties.id))
        .where(and(...where))
        .orderBy(desc(transactions.txnDate), desc(transactions.id));

      const total = rows.reduce((s, r) => s + num(r.txn.totalAmount), 0);
      const balance = rows.reduce((s, r) => s + num(r.txn.balanceAmount), 0);

      return ok({
        rows: rows.map((r) => ({
          ...r.txn,
          partyName: r.party ?? r.txn.partyName,
          label: TXN_META[r.txn.txnType].label,
        })),
        summary: { total: round2(total), balance: round2(balance) },
        range: { from, to },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'profit-and-loss': {
      const agg = async (type: TxnType, column: AnyColumn = transactions.totalAmount) => {
        const [row] = await db
          .select({ sum: sql<string>`coalesce(sum(${column}), 0)` })
          .from(transactions)
          .where(and(scope, eq(transactions.txnType, type)));
        return num(row?.sum);
      };

      const [sale, saleReturn, purchase, purchaseReturn, expense, saleTax, purchaseTax] =
        await Promise.all([
          agg('sale'),
          agg('credit_note'),
          agg('purchase'),
          agg('debit_note'),
          agg('expense'),
          agg('sale', transactions.taxAmount),
          agg('purchase', transactions.taxAmount),
        ]);

      // Closing stock is valued at purchase price, matching Vyapar's default.
      const [stockRow] = await db
        .select({ value: sql<string>`coalesce(sum(${items.stockQty} * ${items.purchasePrice}), 0)` })
        .from(items)
        .where(and(eq(items.firmId, firmId), eq(items.type, 'product')));

      const [openingStockRow] = await db
        .select({
          value: sql<string>`coalesce(sum(${items.openingStock} * ${items.openingStockPrice}), 0)`,
        })
        .from(items)
        .where(and(eq(items.firmId, firmId), eq(items.type, 'product')));

      const expenseByCategory = await db
        .select({
          name: expenseCategories.name,
          type: expenseCategories.type,
          total: sql<string>`coalesce(sum(${transactions.totalAmount}), 0)`,
        })
        .from(transactions)
        .leftJoin(expenseCategories, eq(transactions.expenseCategoryId, expenseCategories.id))
        .where(and(scope, eq(transactions.txnType, 'expense')))
        .groupBy(expenseCategories.name, expenseCategories.type);

      const netSale = round2(sale - saleReturn);
      const netPurchase = round2(purchase - purchaseReturn);
      const openingStock = num(openingStockRow?.value);
      const closingStock = num(stockRow?.value);
      const grossProfit = round2(netSale + closingStock - openingStock - netPurchase);
      const netProfit = round2(grossProfit - expense);

      return ok({
        range: { from, to },
        sale,
        saleReturn,
        netSale,
        purchase,
        purchaseReturn,
        netPurchase,
        openingStock,
        closingStock,
        expense,
        expenseByCategory: expenseByCategory.map((e) => ({
          name: e.name ?? 'Uncategorised',
          type: e.type ?? 'indirect',
          total: num(e.total),
        })),
        taxPayable: round2(saleTax - purchaseTax),
        grossProfit,
        netProfit,
      });
    }

    /* ---------------------------------------------------------------- */
    case 'bill-wise-profit': {
      // Profit per sale invoice = revenue minus the purchase cost of what went out.
      const rows = await db
        .select({
          txnId: transactions.id,
          txnNo: transactions.txnNo,
          txnDate: transactions.txnDate,
          partyName: transactions.partyName,
          total: transactions.totalAmount,
          revenue: sql<string>`coalesce(sum(${transactionItems.total} - ${transactionItems.taxAmount}), 0)`,
          cost: sql<string>`coalesce(sum(${transactionItems.quantity} * ${items.purchasePrice}), 0)`,
        })
        .from(transactions)
        .innerJoin(transactionItems, eq(transactionItems.txnId, transactions.id))
        .leftJoin(items, eq(transactionItems.itemId, items.id))
        .where(and(scope, eq(transactions.txnType, 'sale')))
        .groupBy(transactions.id)
        .orderBy(desc(transactions.txnDate));

      return ok({
        rows: rows.map((r) => ({
          ...r,
          revenue: num(r.revenue),
          cost: num(r.cost),
          profit: round2(num(r.revenue) - num(r.cost)),
        })),
        range: { from, to },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'sale-aging': {
      const today = toISODate();
      const rows = await db
        .select({ txn: transactions, party: parties.name })
        .from(transactions)
        .leftJoin(parties, eq(transactions.partyId, parties.id))
        .where(
          and(
            eq(transactions.firmId, firmId),
            eq(transactions.txnType, 'sale'),
            gt(transactions.balanceAmount, '0'),
          ),
        )
        .orderBy(asc(transactions.dueDate));

      const buckets = { current: 0, d1_30: 0, d31_45: 0, d46_60: 0, d60plus: 0 };
      const detailed = rows.map((r) => {
        const due = r.txn.dueDate ?? r.txn.txnDate;
        const days = Math.round(
          (new Date(today).getTime() - new Date(due).getTime()) / 86_400_000,
        );
        const bal = num(r.txn.balanceAmount);
        if (days <= 0) buckets.current += bal;
        else if (days <= 30) buckets.d1_30 += bal;
        else if (days <= 45) buckets.d31_45 += bal;
        else if (days <= 60) buckets.d46_60 += bal;
        else buckets.d60plus += bal;

        return {
          ...r.txn,
          partyName: r.party ?? r.txn.partyName,
          daysOverdue: Math.max(0, days),
          balance: bal,
        };
      });

      return ok({
        rows: detailed,
        buckets: Object.fromEntries(
          Object.entries(buckets).map(([k, v]) => [k, round2(v)]),
        ) as typeof buckets,
      });
    }

    /* ---------------------------------------------------------------- */
    case 'cash-flow': {
      const rows = await db
        .select({
          date: transactions.txnDate,
          txnType: transactions.txnType,
          received: transactions.receivedAmount,
          partyName: transactions.partyName,
          txnNo: transactions.txnNo,
          id: transactions.id,
        })
        .from(transactions)
        .where(scope)
        .orderBy(asc(transactions.txnDate), asc(transactions.id));

      let running = 0;
      const entries = rows
        .map((r) => {
          const sign = TXN_META[r.txnType].cashSign;
          const amount = round2(sign * num(r.received));
          return { ...r, amount, label: TXN_META[r.txnType].label };
        })
        .filter((r) => r.amount !== 0)
        .map((r) => {
          running = round2(running + r.amount);
          return {
            ...r,
            moneyIn: r.amount > 0 ? r.amount : 0,
            moneyOut: r.amount < 0 ? Math.abs(r.amount) : 0,
            balance: running,
          };
        });

      return ok({
        rows: entries,
        summary: {
          moneyIn: round2(entries.reduce((s, e) => s + e.moneyIn, 0)),
          moneyOut: round2(entries.reduce((s, e) => s + e.moneyOut, 0)),
          net: running,
        },
        range: { from, to },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'party-statement': {
      if (!partyId) return fail('partyId is required for a party statement', 400);
      const id = Number(partyId);

      const [party] = await db
        .select()
        .from(parties)
        .where(and(eq(parties.id, id), eq(parties.firmId, firmId)))
        .limit(1);
      if (!party) return fail('Party not found', 404);

      const rows = await db
        .select()
        .from(transactions)
        .where(and(scope, eq(transactions.partyId, id)))
        .orderBy(asc(transactions.txnDate), asc(transactions.id));

      const opening =
        party.openingBalanceType === 'to_pay'
          ? -num(party.openingBalance)
          : num(party.openingBalance);

      let running = opening;
      const entries = rows.map((r) => {
        const meta = TXN_META[r.txnType];
        const isPayment = r.txnType === 'payment_in' || r.txnType === 'payment_out';
        // Mirrors computeEffects: a later payment posts its own line, so the
        // invoice contributes only what was unpaid when it was raised.
        const delta = round2(
          meta.partySign *
            (isPayment ? num(r.totalAmount) : num(r.totalAmount) - num(r.receivedAmount)),
        );
        running = round2(running + delta);
        return {
          ...r,
          label: meta.label,
          debit: delta > 0 ? delta : 0,
          credit: delta < 0 ? Math.abs(delta) : 0,
          balance: running,
        };
      });

      return ok({ party, opening, rows: entries, closing: running, range: { from, to } });
    }

    /* ---------------------------------------------------------------- */
    case 'all-parties': {
      const rows = await db
        .select()
        .from(parties)
        .where(eq(parties.firmId, firmId))
        .orderBy(asc(parties.name));

      return ok({
        rows,
        summary: {
          receivable: round2(
            rows.reduce((s, p) => s + (num(p.balance) > 0 ? num(p.balance) : 0), 0),
          ),
          payable: round2(
            rows.reduce((s, p) => s + (num(p.balance) < 0 ? Math.abs(num(p.balance)) : 0), 0),
          ),
        },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'sale-purchase-by-party': {
      const rows = await db
        .select({
          partyId: parties.id,
          partyName: parties.name,
          sale: sql<string>`coalesce(sum(case when ${transactions.txnType} = 'sale' then ${transactions.totalAmount} else 0 end), 0)`,
          purchase: sql<string>`coalesce(sum(case when ${transactions.txnType} = 'purchase' then ${transactions.totalAmount} else 0 end), 0)`,
        })
        .from(parties)
        .leftJoin(
          transactions,
          and(
            eq(transactions.partyId, parties.id),
            gte(transactions.txnDate, from),
            lte(transactions.txnDate, to),
          ),
        )
        .where(eq(parties.firmId, firmId))
        .groupBy(parties.id)
        .orderBy(asc(parties.name));

      return ok({
        rows: rows.map((r) => ({ ...r, sale: num(r.sale), purchase: num(r.purchase) })),
        range: { from, to },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'stock-summary': {
      const rows = await db
        .select({
          item: items,
          categoryName: itemCategories.name,
        })
        .from(items)
        .leftJoin(itemCategories, eq(items.categoryId, itemCategories.id))
        .where(and(eq(items.firmId, firmId), eq(items.type, 'product')))
        .orderBy(asc(items.name));

      const detailed = rows.map((r) => ({
        id: r.item.id,
        name: r.item.name,
        itemCode: r.item.itemCode,
        categoryName: r.categoryName,
        stockQty: num(r.item.stockQty),
        purchasePrice: num(r.item.purchasePrice),
        salePrice: num(r.item.salePrice),
        stockValue: round2(num(r.item.stockQty) * num(r.item.purchasePrice)),
        minStockLevel: num(r.item.minStockLevel),
      }));

      return ok({
        rows: detailed,
        summary: { stockValue: round2(detailed.reduce((s, r) => s + r.stockValue, 0)) },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'low-stock': {
      const rows = await db
        .select()
        .from(items)
        .where(
          and(
            eq(items.firmId, firmId),
            eq(items.type, 'product'),
            sql`${items.stockQty} <= ${items.minStockLevel}`,
            gt(items.minStockLevel, '0'),
          ),
        )
        .orderBy(asc(items.name));

      return ok({
        rows: rows.map((r) => ({
          ...r,
          stockQty: num(r.stockQty),
          minStockLevel: num(r.minStockLevel),
          shortBy: round2(num(r.minStockLevel) - num(r.stockQty)),
        })),
      });
    }

    /* ---------------------------------------------------------------- */
    case 'item-wise-profit': {
      const rows = await db
        .select({
          itemId: items.id,
          name: items.name,
          purchasePrice: items.purchasePrice,
          qtySold: sql<string>`coalesce(sum(${transactionItems.quantity}), 0)`,
          revenue: sql<string>`coalesce(sum(${transactionItems.total} - ${transactionItems.taxAmount}), 0)`,
        })
        .from(items)
        .leftJoin(transactionItems, eq(transactionItems.itemId, items.id))
        .leftJoin(
          transactions,
          and(
            eq(transactionItems.txnId, transactions.id),
            eq(transactions.txnType, 'sale'),
            gte(transactions.txnDate, from),
            lte(transactions.txnDate, to),
          ),
        )
        .where(eq(items.firmId, firmId))
        .groupBy(items.id)
        .orderBy(asc(items.name));

      return ok({
        rows: rows
          .map((r) => {
            const qty = num(r.qtySold);
            const revenue = num(r.revenue);
            const cost = round2(qty * num(r.purchasePrice));
            return {
              itemId: r.itemId,
              name: r.name,
              qtySold: qty,
              revenue,
              cost,
              profit: round2(revenue - cost),
            };
          })
          .filter((r) => r.qtySold !== 0),
        range: { from, to },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'item-detail': {
      const rows = await db
        .select({
          itemName: transactionItems.itemName,
          itemId: transactionItems.itemId,
          txnType: transactions.txnType,
          txnNo: transactions.txnNo,
          txnDate: transactions.txnDate,
          partyName: transactions.partyName,
          quantity: transactionItems.quantity,
          unit: transactionItems.unit,
          pricePerUnit: transactionItems.pricePerUnit,
          total: transactionItems.total,
          txnId: transactions.id,
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.txnId, transactions.id))
        .where(scope)
        .orderBy(desc(transactions.txnDate));

      return ok({
        rows: rows.map((r) => ({ ...r, label: TXN_META[r.txnType].label })),
        range: { from, to },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'gstr-1':
    case 'gstr-2': {
      const isSale = slug === 'gstr-1';
      const docTypes: TxnType[] = isSale ? ['sale', 'credit_note'] : ['purchase', 'debit_note'];

      const rows = await db
        .select({
          txn: transactions,
          gstin: parties.gstin,
          partyName: parties.name,
          partyState: parties.state,
        })
        .from(transactions)
        .leftJoin(parties, eq(transactions.partyId, parties.id))
        .where(and(scope, inArray(transactions.txnType, docTypes)))
        .orderBy(asc(transactions.txnDate));

      const rateRows = await db
        .select({
          txnId: transactionItems.txnId,
          taxRate: transactionItems.taxRate,
          taxable: sql<string>`coalesce(sum(${transactionItems.total} - ${transactionItems.taxAmount}), 0)`,
          tax: sql<string>`coalesce(sum(${transactionItems.taxAmount}), 0)`,
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.txnId, transactions.id))
        .where(and(scope, inArray(transactions.txnType, docTypes)))
        .groupBy(transactionItems.txnId, transactionItems.taxRate);

      const byTxn = new Map<number, Array<{ rate: number; taxable: number; tax: number }>>();
      for (const r of rateRows) {
        const arr = byTxn.get(r.txnId) ?? [];
        arr.push({ rate: num(r.taxRate), taxable: num(r.taxable), tax: num(r.tax) });
        byTxn.set(r.txnId, arr);
      }

      return ok({
        rows: rows.map((r) => ({
          txnId: r.txn.id,
          gstin: r.gstin,
          partyName: r.partyName ?? r.txn.partyName,
          partyState: r.partyState,
          txnNo: r.txn.txnNo,
          txnType: r.txn.txnType,
          label: TXN_META[r.txn.txnType].label,
          txnDate: r.txn.txnDate,
          value: num(r.txn.totalAmount),
          taxAmount: num(r.txn.taxAmount),
          rates: byTxn.get(r.txn.id) ?? [],
        })),
        range: { from, to },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'gst-rate': {
      const rows = await db
        .select({
          taxRate: transactionItems.taxRate,
          txnType: transactions.txnType,
          taxable: sql<string>`coalesce(sum(${transactionItems.total} - ${transactionItems.taxAmount}), 0)`,
          tax: sql<string>`coalesce(sum(${transactionItems.taxAmount}), 0)`,
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.txnId, transactions.id))
        .where(and(scope, inArray(transactions.txnType, ['sale', 'purchase'])))
        .groupBy(transactionItems.taxRate, transactions.txnType)
        .orderBy(asc(transactionItems.taxRate));

      return ok({
        rows: rows.map((r) => ({
          taxRate: num(r.taxRate),
          txnType: r.txnType,
          taxable: num(r.taxable),
          tax: num(r.tax),
        })),
        range: { from, to },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'hsn-summary': {
      const rows = await db
        .select({
          hsnSac: transactionItems.hsnSac,
          quantity: sql<string>`coalesce(sum(${transactionItems.quantity}), 0)`,
          taxable: sql<string>`coalesce(sum(${transactionItems.total} - ${transactionItems.taxAmount}), 0)`,
          tax: sql<string>`coalesce(sum(${transactionItems.taxAmount}), 0)`,
          total: sql<string>`coalesce(sum(${transactionItems.total}), 0)`,
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.txnId, transactions.id))
        .where(and(scope, eq(transactions.txnType, 'sale')))
        .groupBy(transactionItems.hsnSac);

      return ok({
        rows: rows.map((r) => ({
          hsnSac: r.hsnSac ?? '—',
          quantity: num(r.quantity),
          taxable: num(r.taxable),
          tax: num(r.tax),
          total: num(r.total),
        })),
        range: { from, to },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'expense': {
      const rows = await db
        .select({ txn: transactions, category: expenseCategories.name })
        .from(transactions)
        .leftJoin(expenseCategories, eq(transactions.expenseCategoryId, expenseCategories.id))
        .where(and(scope, eq(transactions.txnType, 'expense')))
        .orderBy(desc(transactions.txnDate));

      return ok({
        rows: rows.map((r) => ({ ...r.txn, categoryName: r.category ?? 'Uncategorised' })),
        summary: { total: round2(rows.reduce((s, r) => s + num(r.txn.totalAmount), 0)) },
        range: { from, to },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'expense-category': {
      const rows = await db
        .select({
          name: expenseCategories.name,
          type: expenseCategories.type,
          total: sql<string>`coalesce(sum(${transactions.totalAmount}), 0)`,
        })
        .from(expenseCategories)
        .leftJoin(
          transactions,
          and(
            eq(transactions.expenseCategoryId, expenseCategories.id),
            eq(transactions.txnType, 'expense'),
            gte(transactions.txnDate, from),
            lte(transactions.txnDate, to),
          ),
        )
        .where(eq(expenseCategories.firmId, firmId))
        .groupBy(expenseCategories.id)
        .orderBy(asc(expenseCategories.name));

      return ok({ rows: rows.map((r) => ({ ...r, total: num(r.total) })), range: { from, to } });
    }

    /* ---------------------------------------------------------------- */
    case 'orders': {
      const rows = await db
        .select({ txn: transactions, party: parties.name })
        .from(transactions)
        .leftJoin(parties, eq(transactions.partyId, parties.id))
        .where(and(scope, inArray(transactions.txnType, ['sale_order', 'purchase_order'])))
        .orderBy(desc(transactions.txnDate));

      return ok({
        rows: rows.map((r) => ({
          ...r.txn,
          partyName: r.party ?? r.txn.partyName,
          label: TXN_META[r.txn.txnType].label,
        })),
        range: { from, to },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'discount': {
      const rows = await db
        .select({ txn: transactions, party: parties.name })
        .from(transactions)
        .leftJoin(parties, eq(transactions.partyId, parties.id))
        .where(and(scope, gt(transactions.discountAmount, '0'), ne(transactions.txnType, 'expense')))
        .orderBy(desc(transactions.txnDate));

      return ok({
        rows: rows.map((r) => ({
          ...r.txn,
          partyName: r.party ?? r.txn.partyName,
          label: TXN_META[r.txn.txnType].label,
        })),
        summary: { total: round2(rows.reduce((s, r) => s + num(r.txn.discountAmount), 0)) },
        range: { from, to },
      });
    }

    /* ---------------------------------------------------------------- */
    case 'balance-sheet': {
      const [receivable] = await db
        .select({ sum: sql<string>`coalesce(sum(${parties.balance}), 0)` })
        .from(parties)
        .where(and(eq(parties.firmId, firmId), gt(parties.balance, '0')));
      const [payable] = await db
        .select({ sum: sql<string>`coalesce(sum(-${parties.balance}), 0)` })
        .from(parties)
        .where(and(eq(parties.firmId, firmId), sql`${parties.balance} < 0`));
      const [stock] = await db
        .select({ value: sql<string>`coalesce(sum(${items.stockQty} * ${items.purchasePrice}), 0)` })
        .from(items)
        .where(and(eq(items.firmId, firmId), eq(items.type, 'product')));

      return ok({
        assets: {
          receivable: num(receivable?.sum),
          closingStock: num(stock?.value),
        },
        liabilities: {
          payable: num(payable?.sum),
        },
      });
    }

    default:
      return fail(`Unknown report "${slug}"`, 404);
  }
});
