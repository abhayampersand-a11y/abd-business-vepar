import { db } from '@/db';
import { transactions, cashAdjustments } from '@/db/schema';
import { and, eq, isNull, sql, desc } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, created } from '@/server/http';
import { cashAdjustmentSchema } from '@/lib/validators';
import { activeMoneyDeltaSql } from '@/server/money';
import { num, round2 } from '@/lib/format';
import { TXN_META } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * Cash in hand = every cash-settled transaction plus manual adjustments.
 * A transaction counts as cash when no bank account is attached to it.
 */
export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);

  const cashWhere = and(
    eq(transactions.firmId, firmId),
    isNull(transactions.bankAccountId),
    sql`${transactions.paymentType} = 'Cash'`,
  );

  const [txnRows, adjustRows] = await Promise.all([
    db
      .select({ txn: transactions, delta: sql<string>`${activeMoneyDeltaSql()}` })
      .from(transactions)
      .where(cashWhere)
      .orderBy(desc(transactions.txnDate), desc(transactions.id)),
    db
      .select()
      .from(cashAdjustments)
      .where(eq(cashAdjustments.firmId, firmId))
      .orderBy(desc(cashAdjustments.adjustmentDate)),
  ]);

  const txnTotal = txnRows.reduce((s, r) => s + num(r.delta), 0);
  const adjustTotal = adjustRows.reduce(
    (s, a) => s + (a.type === 'add' ? num(a.amount) : -num(a.amount)),
    0,
  );

  const entries = [
    ...txnRows
      .filter((r) => num(r.delta) !== 0)
      .map((r) => ({
        id: `txn-${r.txn.id}`,
        txnId: r.txn.id,
        type: TXN_META[r.txn.txnType].label,
        txnType: r.txn.txnType,
        name: r.txn.partyName ?? r.txn.description ?? TXN_META[r.txn.txnType].label,
        date: r.txn.txnDate,
        amount: num(r.delta),
      })),
    ...adjustRows.map((a) => ({
      id: `adj-${a.id}`,
      txnId: null,
      type: a.type === 'add' ? 'Cash Added' : 'Cash Reduced',
      txnType: null,
      name: a.description ?? 'Manual adjustment',
      date: a.adjustmentDate,
      amount: a.type === 'add' ? num(a.amount) : -num(a.amount),
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return ok({
    balance: round2(txnTotal + adjustTotal),
    entries,
  });
});

export const POST = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const body = cashAdjustmentSchema.parse(await request.json());

  const [row] = await db
    .insert(cashAdjustments)
    .values({
      firmId,
      type: body.type,
      amount: String(num(body.amount)),
      adjustmentDate: body.adjustmentDate,
      description: body.description ?? null,
    })
    .returning();

  return created(row);
});
