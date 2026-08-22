import { db } from '@/db';
import { expenseCategories, transactions } from '@/db/schema';
import { eq, asc, sql, and } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, created } from '@/server/http';
import { expenseCategorySchema } from '@/lib/validators';
import { num } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);

  const rows = await db
    .select({
      id: expenseCategories.id,
      name: expenseCategories.name,
      type: expenseCategories.type,
      total: sql<string>`coalesce(sum(${transactions.totalAmount}), 0)`,
      balance: sql<string>`coalesce(sum(${transactions.balanceAmount}), 0)`,
    })
    .from(expenseCategories)
    .leftJoin(
      transactions,
      and(
        eq(transactions.expenseCategoryId, expenseCategories.id),
        eq(transactions.txnType, 'expense'),
      ),
    )
    .where(eq(expenseCategories.firmId, firmId))
    .groupBy(expenseCategories.id)
    .orderBy(asc(expenseCategories.name));

  return ok(rows.map((r) => ({ ...r, total: num(r.total), balance: num(r.balance) })));
});

export const POST = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const body = expenseCategorySchema.parse(await request.json());
  const [row] = await db.insert(expenseCategories).values({ ...body, firmId }).returning();
  return created(row);
});

export const DELETE = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const id = Number(new URL(request.url).searchParams.get('id'));
  await db
    .delete(expenseCategories)
    .where(and(eq(expenseCategories.id, id), eq(expenseCategories.firmId, firmId)));
  return ok({ id });
});
