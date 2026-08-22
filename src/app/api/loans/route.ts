import { db } from '@/db';
import { loanAccounts, loanTransactions } from '@/db/schema';
import { and, eq, asc, sql } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, created } from '@/server/http';
import { loanAccountSchema, loanTransactionSchema } from '@/lib/validators';
import { num, round2 } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);

  const rows = await db
    .select({
      loan: loanAccounts,
      paid: sql<string>`coalesce(sum(${loanTransactions.principal}), 0)`,
      interestPaid: sql<string>`coalesce(sum(${loanTransactions.interest}), 0)`,
    })
    .from(loanAccounts)
    .leftJoin(loanTransactions, eq(loanTransactions.loanId, loanAccounts.id))
    .where(eq(loanAccounts.firmId, firmId))
    .groupBy(loanAccounts.id)
    .orderBy(asc(loanAccounts.lenderName));

  return ok(
    rows.map((r) => ({
      ...r.loan,
      principalPaid: num(r.paid),
      interestPaid: num(r.interestPaid),
      currentBalance: round2(num(r.loan.openingBalance) - num(r.paid)),
    })),
  );
});

export const POST = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const body = loanAccountSchema.parse(await request.json());

  const [row] = await db
    .insert(loanAccounts)
    .values({
      firmId,
      lenderName: body.lenderName,
      accountNumber: body.accountNumber ?? null,
      loanType: body.loanType ?? null,
      description: body.description ?? null,
      openingBalance: String(num(body.openingBalance)),
      currentBalance: String(num(body.openingBalance)),
      interestRate: String(num(body.interestRate)),
      termMonths: body.termMonths ?? null,
      openingDate: body.openingDate ?? null,
    })
    .returning();

  return created(row);
});

export const DELETE = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const id = Number(new URL(request.url).searchParams.get('id'));
  await db.delete(loanAccounts).where(and(eq(loanAccounts.id, id), eq(loanAccounts.firmId, firmId)));
  return ok({ id });
});

/** Records an EMI / interest / charge against a loan. */
export const PUT = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const url = new URL(request.url);
  const loanId = Number(url.searchParams.get('loanId'));
  const body = loanTransactionSchema.parse(await request.json());

  const [loan] = await db
    .select()
    .from(loanAccounts)
    .where(and(eq(loanAccounts.id, loanId), eq(loanAccounts.firmId, firmId)))
    .limit(1);
  if (!loan) return ok({ error: 'Loan not found' }, { status: 404 });

  const [row] = await db
    .insert(loanTransactions)
    .values({
      loanId,
      type: body.type,
      amount: String(num(body.amount)),
      principal: String(num(body.principal)),
      interest: String(num(body.interest)),
      txnDate: body.txnDate,
      paymentType: body.paymentType,
      bankAccountId: body.bankAccountId,
      description: body.description ?? null,
    })
    .returning();

  return created(row);
});
