import { getActiveFirmId } from '@/server/firm';
import { handler, ok, created, listParams } from '@/server/http';
import {
  createTransaction,
  listTransactions,
  summariseTransactions,
  nextTxnNo,
} from '@/server/txn-service';
import { transactionSchema } from '@/lib/validators';
import { db } from '@/db';
import type { TxnType } from '@/db/schema';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const url = new URL(request.url);
  const params = listParams(url);

  const typeParam = url.searchParams.get('types') ?? url.searchParams.get('type');
  const types = typeParam ? (typeParam.split(',').filter(Boolean) as TxnType[]) : undefined;

  const filters = { ...params, types };

  const [rows, summary] = await Promise.all([
    listTransactions(firmId, filters),
    summariseTransactions(firmId, filters),
  ]);

  return ok({ transactions: rows, summary });
});

export const POST = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const body = transactionSchema.parse(await request.json());

  try {
    const row = await createTransaction(firmId, body);
    return created(row);
  } catch (err) {
    // Two documents racing for the same number — take the next one and retry.
    if (err instanceof Error && /duplicate key/i.test(err.message)) {
      const retryNo = await nextTxnNo(db, firmId, body.txnType);
      const row = await createTransaction(firmId, { ...body, txnNo: retryNo });
      return created(row);
    }
    throw err;
  }
});
