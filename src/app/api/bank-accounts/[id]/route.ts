import { db } from '@/db';
import { bankAccounts, transactions } from '@/db/schema';
import { and, eq, sql, gte, lte } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, fail } from '@/server/http';
import { bankAccountSchema } from '@/lib/validators';
import { activeMoneyDeltaSql } from '@/server/money';
import { num, round2 } from '@/lib/format';
import { TXN_META } from '@/lib/constants';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Account detail plus the running bank statement. */
export const GET = handler(async (request: Request, { params }: Ctx) => {
  const firmId = await getActiveFirmId(request);
  const id = Number((await params).id);
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const [account] = await db
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.id, id), eq(bankAccounts.firmId, firmId)))
    .limit(1);
  if (!account) return fail('Bank account not found', 404);

  const where = [eq(transactions.bankAccountId, id), eq(transactions.firmId, firmId)];
  if (from) where.push(gte(transactions.txnDate, from));
  if (to) where.push(lte(transactions.txnDate, to));

  const rows = await db
    .select({
      txn: transactions,
      delta: sql<string>`${activeMoneyDeltaSql()}`,
    })
    .from(transactions)
    .where(and(...where))
    .orderBy(transactions.txnDate, transactions.id);

  // Anything before the window is folded into the opening figure.
  const [priorRow] = from
    ? await db
        .select({ sum: sql<string>`coalesce(sum(${activeMoneyDeltaSql()}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.bankAccountId, id),
            eq(transactions.firmId, firmId),
            sql`${transactions.txnDate} < ${from}`,
          ),
        )
    : [{ sum: '0' }];

  let running = round2(num(account.openingBalance) + num(priorRow?.sum));
  const openingForPeriod = running;

  const statement = rows.map((r) => {
    const delta = num(r.delta);
    running = round2(running + delta);
    return {
      id: r.txn.id,
      date: r.txn.txnDate,
      description:
        r.txn.description ||
        `${TXN_META[r.txn.txnType].label}${r.txn.partyName ? ` — ${r.txn.partyName}` : ''}`,
      txnType: r.txn.txnType,
      txnNo: r.txn.txnNo,
      withdrawal: delta < 0 ? Math.abs(delta) : 0,
      deposit: delta > 0 ? delta : 0,
      balance: running,
    };
  });

  return ok({
    ...account,
    openingForPeriod,
    balance: running,
    statement,
  });
});

export const PUT = handler(async (request: Request, { params }: Ctx) => {
  const firmId = await getActiveFirmId(request);
  const id = Number((await params).id);
  const body = bankAccountSchema.parse(await request.json());

  const [row] = await db
    .update(bankAccounts)
    .set({
      accountName: body.accountName,
      bankName: body.bankName ?? null,
      accountNumber: body.accountNumber ?? null,
      ifscCode: body.ifscCode ?? null,
      upiId: body.upiId ?? null,
      accountHolderName: body.accountHolderName ?? null,
      openingBalance: String(num(body.openingBalance)),
      asOfDate: body.asOfDate ?? null,
      printUpiQr: body.printUpiQr ?? false,
      printBankDetails: body.printBankDetails ?? false,
    })
    .where(and(eq(bankAccounts.id, id), eq(bankAccounts.firmId, firmId)))
    .returning();

  if (!row) return fail('Bank account not found', 404);
  return ok(row);
});
