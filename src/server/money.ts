import { sql, type SQL } from 'drizzle-orm';
import { TXN_META } from '@/lib/constants';
import { txnTypeEnum } from '@/db/schema';

/**
 * SQL expression for the signed cash movement of a transaction row.
 *
 * Cash and bank balances are derived rather than denormalised — there is no
 * running total to drift, and the aggregate is cheap.
 */
export function moneyDeltaSql(): SQL {
  const cases = txnTypeEnum.enumValues
    .map((t) => {
      const sign = TXN_META[t].cashSign;
      return `when '${t}' then ${sign}`;
    })
    .join(' ');

  return sql.raw(
    `(case transactions.txn_type ${cases} else 0 end) * coalesce(transactions.received_amount, 0)`,
  );
}

/** Same expression, but skipping cancelled documents. */
export function activeMoneyDeltaSql(): SQL {
  return sql`(case when transactions.status = 'cancelled' then 0 else ${moneyDeltaSql()} end)`;
}
