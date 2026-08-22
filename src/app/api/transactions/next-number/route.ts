import { db } from '@/db';
import { txnTypeEnum, type TxnType } from '@/db/schema';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, fail } from '@/server/http';
import { nextTxnNo } from '@/server/txn-service';

export const dynamic = 'force-dynamic';

/** Feeds the "Invoice No." field when a new document form opens. */
export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const type = new URL(request.url).searchParams.get('type') as TxnType | null;

  if (!type || !txnTypeEnum.enumValues.includes(type)) {
    return fail('A valid ?type= is required', 400);
  }

  return ok({ txnNo: await nextTxnNo(db, firmId, type) });
});
