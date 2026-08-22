import { getActiveFirmId } from '@/server/firm';
import { handler, ok } from '@/server/http';
import { recalculateBalances } from '@/server/txn-service';

export const dynamic = 'force-dynamic';

/**
 * "Verify My Data" — rebuilds every party balance and stock quantity from the
 * underlying ledger. Safe to run at any time.
 */
export const POST = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const result = await recalculateBalances(firmId);
  return ok({ ...result, message: 'Balances and stock recalculated from the ledger.' });
});
