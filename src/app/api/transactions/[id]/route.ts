import { getActiveFirmId } from '@/server/firm';
import { handler, ok, fail } from '@/server/http';
import { getTransaction, updateTransaction, deleteTransaction } from '@/server/txn-service';
import { transactionSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (request: Request, { params }: Ctx) => {
  const firmId = await getActiveFirmId(request);
  const id = Number((await params).id);
  const txn = await getTransaction(firmId, id);
  if (!txn) return fail('Transaction not found', 404);
  return ok(txn);
});

export const PUT = handler(async (request: Request, { params }: Ctx) => {
  const firmId = await getActiveFirmId(request);
  const id = Number((await params).id);
  const body = transactionSchema.parse(await request.json());
  const row = await updateTransaction(firmId, id, body);
  return ok(row);
});

export const DELETE = handler(async (request: Request, { params }: Ctx) => {
  const firmId = await getActiveFirmId(request);
  const id = Number((await params).id);
  await deleteTransaction(firmId, id);
  return ok({ id });
});
