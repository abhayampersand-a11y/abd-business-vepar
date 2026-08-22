import { TXN_META } from '@/lib/constants';
import { round2, round3 } from '@/lib/format';
import type { TxnType } from '@/db/schema';

/** Document types that *are* a payment rather than a document being paid. */
const PAYMENT_TYPES: TxnType[] = [
  'payment_in',
  'payment_out',
  'party_to_party_received',
  'party_to_party_paid',
];

export const isPaymentDoc = (t: TxnType) => PAYMENT_TYPES.includes(t);

export type TxnEffectInput = {
  txnType: TxnType;
  totalAmount: number;
  /** Paid on the document itself. Excludes later payment documents. */
  receivedAmount: number;
  lines: Array<{ itemId: number | null; quantity: number }>;
};

export type TxnEffects = {
  /** Signed change to party.balance. Positive => party owes us more. */
  partyDelta: number;
  /** Signed change to cash-in-hand or the linked bank account. */
  moneyDelta: number;
  /** Signed change to each item's stock quantity. */
  stockDeltas: Array<{ itemId: number; delta: number }>;
};

/**
 * Single source of truth for what a document does to the books.
 *
 * Posting applies these deltas; editing reverts the old set and applies the
 * new; deleting just reverts. Keeping the maths in one place is what stops
 * balances from drifting.
 *
 * The party figure deliberately uses `totalAmount - receivedAmount` rather
 * than the stored balance: a later payment-in posts its own entry, so folding
 * its allocation into the invoice too would count it twice.
 */
export function computeEffects(input: TxnEffectInput): TxnEffects {
  const meta = TXN_META[input.txnType];

  const partyBase = isPaymentDoc(input.txnType)
    ? input.totalAmount
    : input.totalAmount - input.receivedAmount;
  const partyDelta = round2(meta.partySign * partyBase);

  const moneyDelta = round2(meta.cashSign * input.receivedAmount);

  const stockDeltas: Array<{ itemId: number; delta: number }> = [];
  if (meta.affectsStock) {
    const sign = meta.affectsStock === 'in' ? 1 : -1;
    for (const line of input.lines) {
      if (!line.itemId) continue;
      stockDeltas.push({ itemId: line.itemId, delta: round3(sign * line.quantity) });
    }
  }

  return { partyDelta, moneyDelta, stockDeltas };
}

/** Flips every delta — used when editing or deleting a posted document. */
export function invertEffects(e: TxnEffects): TxnEffects {
  return {
    partyDelta: round2(-e.partyDelta),
    moneyDelta: round2(-e.moneyDelta),
    stockDeltas: e.stockDeltas.map((s) => ({ itemId: s.itemId, delta: round3(-s.delta) })),
  };
}
