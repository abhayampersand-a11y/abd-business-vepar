import { num, round2, round3 } from './format';

/**
 * Invoice arithmetic. Deliberately shared by the entry form and the API so the
 * number the user sees while typing is exactly the number that gets stored.
 */

export type LineInput = {
  itemId?: number | null;
  itemName: string;
  hsnSac?: string | null;
  quantity: number | string;
  unit?: string | null;
  pricePerUnit: number | string;
  isTaxInclusive?: boolean;
  /** Discount is entered as a percent; the amount is derived. */
  discountPercent?: number | string;
  discountAmount?: number | string;
  taxRate?: number | string;
};

export type LineComputed = {
  itemId: number | null;
  itemName: string;
  hsnSac: string | null;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  isTaxInclusive: boolean;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  /** Taxable value after discount, before tax. */
  taxableValue: number;
  /** Line total including tax. */
  total: number;
};

/**
 * Computes one line.
 *
 * When `isTaxInclusive` the entered price already contains tax, so the taxable
 * value is backed out as price / (1 + rate/100) — this is how Vyapar treats
 * "Price/Unit (incl)".
 */
export function computeLine(line: LineInput): LineComputed {
  const quantity = round3(num(line.quantity));
  const rate = num(line.taxRate);
  const inclusive = Boolean(line.isTaxInclusive);
  const enteredPrice = num(line.pricePerUnit);

  // Unit price excluding tax
  const unitExcl = inclusive ? enteredPrice / (1 + rate / 100) : enteredPrice;
  const gross = round2(unitExcl * quantity);

  // Discount: percent wins if supplied, otherwise use the flat amount.
  const pct = num(line.discountPercent);
  let discountAmount: number;
  let discountPercent: number;
  if (pct > 0) {
    discountPercent = pct;
    discountAmount = round2((gross * pct) / 100);
  } else {
    discountAmount = round2(num(line.discountAmount));
    discountPercent = gross > 0 ? round2((discountAmount / gross) * 100) : 0;
  }
  if (discountAmount > gross) discountAmount = gross;

  const taxableValue = round2(gross - discountAmount);
  const taxAmount = round2((taxableValue * rate) / 100);
  const total = round2(taxableValue + taxAmount);

  return {
    itemId: line.itemId ?? null,
    itemName: line.itemName,
    hsnSac: line.hsnSac ?? null,
    quantity,
    unit: line.unit || 'Pcs',
    pricePerUnit: round2(enteredPrice),
    isTaxInclusive: inclusive,
    discountPercent,
    discountAmount,
    taxRate: rate,
    taxAmount,
    taxableValue,
    total,
  };
}

export type TotalsInput = {
  lines: LineInput[];
  /** Invoice-level discount applied after line discounts. */
  invoiceDiscountPercent?: number | string;
  invoiceDiscountAmount?: number | string;
  /** Extra charges (shipping, packaging…). */
  additionalCharges?: number | string;
  roundOffEnabled?: boolean;
  receivedAmount?: number | string;
};

export type TotalsComputed = {
  lines: LineComputed[];
  /** Sum of taxable values before invoice-level discount. */
  subtotal: number;
  lineDiscountTotal: number;
  invoiceDiscount: number;
  discountAmount: number;
  taxAmount: number;
  additionalCharges: number;
  roundOff: number;
  totalAmount: number;
  receivedAmount: number;
  balanceAmount: number;
  /** GST split — CGST/SGST for intra-state, IGST for inter-state. */
  taxBreakup: Array<{ rate: number; taxableValue: number; taxAmount: number }>;
};

export function computeTotals(input: TotalsInput): TotalsComputed {
  const lines = input.lines.map(computeLine);

  const subtotal = round2(lines.reduce((s, l) => s + l.taxableValue, 0));
  const lineDiscountTotal = round2(lines.reduce((s, l) => s + l.discountAmount, 0));
  const lineTax = round2(lines.reduce((s, l) => s + l.taxAmount, 0));

  const invPct = num(input.invoiceDiscountPercent);
  let invoiceDiscount =
    invPct > 0 ? round2((subtotal * invPct) / 100) : round2(num(input.invoiceDiscountAmount));
  if (invoiceDiscount > subtotal) invoiceDiscount = subtotal;

  const additionalCharges = round2(num(input.additionalCharges));

  // An invoice-level discount reduces tax proportionally.
  const factor = subtotal > 0 ? (subtotal - invoiceDiscount) / subtotal : 1;
  const taxAmount = round2(lineTax * factor);

  const preRound = round2(subtotal - invoiceDiscount + taxAmount + additionalCharges);
  const roundOff = input.roundOffEnabled ? round2(Math.round(preRound) - preRound) : 0;
  const totalAmount = round2(preRound + roundOff);

  const receivedAmount = Math.min(round2(num(input.receivedAmount)), totalAmount);
  const balanceAmount = round2(totalAmount - receivedAmount);

  // Group tax by rate for the GST summary printed on the invoice.
  const byRate = new Map<number, { taxableValue: number; taxAmount: number }>();
  for (const l of lines) {
    const bucket = byRate.get(l.taxRate) ?? { taxableValue: 0, taxAmount: 0 };
    bucket.taxableValue = round2(bucket.taxableValue + l.taxableValue * factor);
    bucket.taxAmount = round2(bucket.taxAmount + l.taxAmount * factor);
    byRate.set(l.taxRate, bucket);
  }
  const taxBreakup = [...byRate.entries()]
    .map(([rate, v]) => ({ rate, ...v }))
    .sort((a, b) => a.rate - b.rate);

  return {
    lines,
    subtotal,
    lineDiscountTotal,
    invoiceDiscount,
    discountAmount: round2(lineDiscountTotal + invoiceDiscount),
    taxAmount,
    additionalCharges,
    roundOff,
    totalAmount,
    receivedAmount,
    balanceAmount,
    taxBreakup,
  };
}

/**
 * A transaction is intra-state when both parties sit in the same state, which
 * decides CGST+SGST vs IGST.
 */
export function isIntraState(firmState?: string | null, partyState?: string | null): boolean {
  if (!firmState || !partyState) return true;
  return firmState.trim().toLowerCase() === partyState.trim().toLowerCase();
}

export function splitGST(taxAmount: number, intraState: boolean) {
  if (intraState) {
    const half = round2(taxAmount / 2);
    return { cgst: half, sgst: round2(taxAmount - half), igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: round2(taxAmount) };
}

/** Derives the payment status shown in list screens. */
export function deriveStatus(
  total: number,
  received: number,
  dueDate: string | null | undefined,
  today: string,
): 'paid' | 'partial' | 'unpaid' | 'overdue' {
  const bal = round2(total - received);
  if (bal <= 0) return 'paid';
  const overdue = Boolean(dueDate && dueDate < today);
  if (received > 0) return overdue ? 'overdue' : 'partial';
  return overdue ? 'overdue' : 'unpaid';
}
