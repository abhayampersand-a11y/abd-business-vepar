import { db } from '@/db';
import { transactions, parties, items, cashAdjustments, bankAccounts } from '@/db/schema';
import { and, eq, sql, gte, lte, isNull, inArray, gt, lt, desc } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok } from '@/server/http';
import { activeMoneyDeltaSql } from '@/server/money';
import { num, round2, resolveDateRange, toISODate, type DateRangeKey } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const url = new URL(request.url);
  const rangeKey = (url.searchParams.get('range') ?? 'this_month') as DateRangeKey;
  const range = resolveDateRange(rangeKey);
  const from = url.searchParams.get('from') ?? range.from;
  const to = url.searchParams.get('to') ?? range.to;

  const [
    receivableRow,
    payableRow,
    saleRow,
    prevSaleRow,
    purchaseRow,
    expenseRow,
    cashTxnRow,
    cashAdjRow,
    bankRows,
    stockRow,
    lowStockRow,
    openOrderRow,
    salesSeries,
    recentTxns,
  ] = await Promise.all([
    // Money owed to us
    db
      .select({ sum: sql<string>`coalesce(sum(${parties.balance}), 0)` })
      .from(parties)
      .where(and(eq(parties.firmId, firmId), gt(parties.balance, '0'))),

    // Money we owe
    db
      .select({ sum: sql<string>`coalesce(sum(-${parties.balance}), 0)` })
      .from(parties)
      .where(and(eq(parties.firmId, firmId), lt(parties.balance, '0'))),

    db
      .select({
        total: sql<string>`coalesce(sum(${transactions.totalAmount}), 0)`,
        received: sql<string>`coalesce(sum(${transactions.receivedAmount}), 0)`,
        balance: sql<string>`coalesce(sum(${transactions.balanceAmount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.firmId, firmId),
          eq(transactions.txnType, 'sale'),
          gte(transactions.txnDate, from),
          lte(transactions.txnDate, to),
        ),
      ),

    // Same length of window immediately before, for the "vs last month" delta
    db
      .select({ total: sql<string>`coalesce(sum(${transactions.totalAmount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.firmId, firmId),
          eq(transactions.txnType, 'sale'),
          sql`${transactions.txnDate} >= (${from}::date - (${to}::date - ${from}::date + 1))`,
          lt(transactions.txnDate, from),
        ),
      ),

    db
      .select({ total: sql<string>`coalesce(sum(${transactions.totalAmount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.firmId, firmId),
          eq(transactions.txnType, 'purchase'),
          gte(transactions.txnDate, from),
          lte(transactions.txnDate, to),
        ),
      ),

    db
      .select({ total: sql<string>`coalesce(sum(${transactions.totalAmount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.firmId, firmId),
          eq(transactions.txnType, 'expense'),
          gte(transactions.txnDate, from),
          lte(transactions.txnDate, to),
        ),
      ),

    db
      .select({ sum: sql<string>`coalesce(sum(${activeMoneyDeltaSql()}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.firmId, firmId),
          isNull(transactions.bankAccountId),
          sql`${transactions.paymentType} = 'Cash'`,
        ),
      ),

    db
      .select({
        sum: sql<string>`coalesce(sum(case when ${cashAdjustments.type} = 'add' then ${cashAdjustments.amount} else -${cashAdjustments.amount} end), 0)`,
      })
      .from(cashAdjustments)
      .where(eq(cashAdjustments.firmId, firmId)),

    db
      .select({
        opening: sql<string>`coalesce(sum(${bankAccounts.openingBalance}), 0)`,
      })
      .from(bankAccounts)
      .where(eq(bankAccounts.firmId, firmId)),

    db
      .select({
        value: sql<string>`coalesce(sum(${items.stockQty} * ${items.purchasePrice}), 0)`,
      })
      .from(items)
      .where(and(eq(items.firmId, firmId), eq(items.type, 'product'))),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(
        and(
          eq(items.firmId, firmId),
          eq(items.type, 'product'),
          gt(items.minStockLevel, '0'),
          sql`${items.stockQty} <= ${items.minStockLevel}`,
        ),
      ),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(
        and(
          eq(transactions.firmId, firmId),
          inArray(transactions.txnType, ['sale_order', 'purchase_order']),
          eq(transactions.status, 'open'),
        ),
      ),

    // Daily sale totals drive the dashboard chart
    db
      .select({
        date: transactions.txnDate,
        total: sql<string>`coalesce(sum(${transactions.totalAmount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.firmId, firmId),
          eq(transactions.txnType, 'sale'),
          gte(transactions.txnDate, from),
          lte(transactions.txnDate, to),
        ),
      )
      .groupBy(transactions.txnDate)
      .orderBy(transactions.txnDate),

    db
      .select()
      .from(transactions)
      .where(eq(transactions.firmId, firmId))
      .orderBy(desc(transactions.createdAt))
      .limit(8),
  ]);

  // Bank movement across all accounts
  const [bankMovement] = await db
    .select({ sum: sql<string>`coalesce(sum(${activeMoneyDeltaSql()}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.firmId, firmId), sql`${transactions.bankAccountId} is not null`));

  const saleTotal = num(saleRow[0]?.total);
  const prevSaleTotal = num(prevSaleRow[0]?.total);
  const growth =
    prevSaleTotal > 0
      ? round2(((saleTotal - prevSaleTotal) / prevSaleTotal) * 100)
      : saleTotal > 0
        ? 100
        : 0;

  return ok({
    range: { from, to, key: rangeKey },
    receivable: num(receivableRow[0]?.sum),
    payable: num(payableRow[0]?.sum),
    sale: {
      total: saleTotal,
      received: num(saleRow[0]?.received),
      balance: num(saleRow[0]?.balance),
      count: saleRow[0]?.count ?? 0,
      growth,
    },
    purchase: { total: num(purchaseRow[0]?.total) },
    expense: { total: num(expenseRow[0]?.total) },
    cashInHand: round2(num(cashTxnRow[0]?.sum) + num(cashAdjRow[0]?.sum)),
    bankBalance: round2(num(bankRows[0]?.opening) + num(bankMovement?.sum)),
    stockValue: num(stockRow[0]?.value),
    lowStockCount: lowStockRow[0]?.count ?? 0,
    openOrders: openOrderRow[0]?.count ?? 0,
    salesSeries: salesSeries.map((s) => ({ date: s.date, total: num(s.total) })),
    recentTransactions: recentTxns,
    today: toISODate(),
  });
});
