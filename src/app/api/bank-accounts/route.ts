import { db } from '@/db';
import { bankAccounts, transactions } from '@/db/schema';
import { eq, asc, sql, and } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, created } from '@/server/http';
import { bankAccountSchema } from '@/lib/validators';
import { activeMoneyDeltaSql } from '@/server/money';
import { num, round2 } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);

  const rows = await db
    .select({
      account: bankAccounts,
      movement: sql<string>`coalesce(sum(${activeMoneyDeltaSql()}), 0)`,
    })
    .from(bankAccounts)
    .leftJoin(transactions, eq(transactions.bankAccountId, bankAccounts.id))
    .where(eq(bankAccounts.firmId, firmId))
    .groupBy(bankAccounts.id)
    .orderBy(asc(bankAccounts.accountName));

  return ok(
    rows.map((r) => ({
      ...r.account,
      balance: round2(num(r.account.openingBalance) + num(r.movement)),
    })),
  );
});

export const POST = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const body = bankAccountSchema.parse(await request.json());

  const [row] = await db
    .insert(bankAccounts)
    .values({
      firmId,
      accountName: body.accountName,
      bankName: body.bankName ?? null,
      accountNumber: body.accountNumber ?? null,
      ifscCode: body.ifscCode ?? null,
      upiId: body.upiId ?? null,
      accountHolderName: body.accountHolderName ?? null,
      openingBalance: String(num(body.openingBalance)),
      asOfDate: body.asOfDate ?? null,
      balance: String(num(body.openingBalance)),
      printUpiQr: body.printUpiQr ?? false,
      printBankDetails: body.printBankDetails ?? false,
    })
    .returning();

  return created(row);
});

export const DELETE = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const id = Number(new URL(request.url).searchParams.get('id'));
  await db.delete(bankAccounts).where(and(eq(bankAccounts.id, id), eq(bankAccounts.firmId, firmId)));
  return ok({ id });
});
