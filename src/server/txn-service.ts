import { db } from '@/db';
import {
  transactions,
  transactionItems,
  parties,
  items,
  paymentAllocations,
  type TxnType,
} from '@/db/schema';
import { and, eq, sql, desc, asc, gte, lte, inArray, ilike, or } from 'drizzle-orm';
import { computeTotals, deriveStatus } from '@/lib/calc';
import { TXN_META } from '@/lib/constants';
import { num, round2, toISODate } from '@/lib/format';
import { computeEffects, invertEffects, isPaymentDoc, type TxnEffects } from './effects';
import type { TransactionParsed } from '@/lib/validators';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/* ------------------------------------------------------------------ *
 * Numbering
 * ------------------------------------------------------------------ */

export async function nextTxnNo(tx: Tx | typeof db, firmId: number, txnType: TxnType) {
  const [row] = await tx
    .select({ max: sql<number>`coalesce(max(${transactions.txnNo}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.firmId, firmId), eq(transactions.txnType, txnType)));
  return (row?.max ?? 0) + 1;
}

/* ------------------------------------------------------------------ *
 * Applying / reverting the books
 * ------------------------------------------------------------------ */

async function applyEffects(tx: Tx, partyId: number | null, effects: TxnEffects) {
  if (partyId && effects.partyDelta !== 0) {
    await tx
      .update(parties)
      .set({ balance: sql`${parties.balance} + ${effects.partyDelta}` })
      .where(eq(parties.id, partyId));
  }

  for (const s of effects.stockDeltas) {
    if (s.delta === 0) continue;
    await tx
      .update(items)
      .set({ stockQty: sql`${items.stockQty} + ${s.delta}` })
      .where(eq(items.id, s.itemId));
  }
}

/** Rebuilds the effect record of an already-stored transaction. */
async function effectsOfStored(
  tx: Tx,
  txnId: number,
): Promise<{ effects: TxnEffects; partyId: number | null }> {
  const [stored] = await tx.select().from(transactions).where(eq(transactions.id, txnId)).limit(1);
  if (!stored) throw new NotFoundError('Transaction not found');

  const lines = await tx
    .select({ itemId: transactionItems.itemId, quantity: transactionItems.quantity })
    .from(transactionItems)
    .where(eq(transactionItems.txnId, txnId));

  const effects = computeEffects({
    txnType: stored.txnType,
    totalAmount: num(stored.totalAmount),
    receivedAmount: num(stored.receivedAmount),
    lines: lines.map((l) => ({ itemId: l.itemId, quantity: num(l.quantity) })),
  });

  return { effects, partyId: stored.partyId };
}

/* ------------------------------------------------------------------ *
 * Shaping an incoming payload into stored columns
 * ------------------------------------------------------------------ */

function buildRow(
  firmId: number,
  input: TransactionParsed,
  txnNo: number,
  /** Allocations already knocked off this document by other payments. */
  settledAmount = 0,
) {
  const meta = TXN_META[input.txnType];
  const today = toISODate();

  if (isPaymentDoc(input.txnType)) {
    // A payment has no line items — the amount *is* the document.
    const total = round2(num(input.totalAmount ?? input.receivedAmount));
    return {
      row: {
        firmId,
        txnType: input.txnType,
        txnNo,
        prefix: meta.prefix,
        partyId: input.partyId,
        partyName: input.partyName ?? null,
        txnDate: input.txnDate,
        dueDate: null,
        refNo: input.refNo ?? null,
        subtotal: String(total),
        discountAmount: '0',
        taxAmount: '0',
        roundOff: '0',
        totalAmount: String(total),
        receivedAmount: String(total),
        settledAmount: '0',
        balanceAmount: '0',
        paymentType: input.paymentType || 'Cash',
        bankAccountId: input.bankAccountId,
        chequeNo: input.chequeNo ?? null,
        expenseCategoryId: input.expenseCategoryId,
        status: 'paid' as const,
        description: input.description ?? null,
        notes: input.notes ?? null,
        linkedTxnId: input.linkedTxnId,
        transportName: null,
        vehicleNumber: null,
        deliveryDate: null,
        deliveryLocation: null,
        ewayBillNo: null,
        updatedAt: new Date(),
      },
      lines: [] as ReturnType<typeof computeTotals>['lines'],
    };
  }

  const totals = computeTotals({
    lines: input.lines,
    invoiceDiscountPercent: input.invoiceDiscountPercent,
    invoiceDiscountAmount: input.invoiceDiscountAmount,
    additionalCharges: input.additionalCharges,
    roundOffEnabled: input.roundOffEnabled,
    receivedAmount: input.receivedAmount,
  });

  // Settlements from separate payment documents also reduce what is due.
  const settled = Math.min(round2(settledAmount), totals.balanceAmount);
  const balance = round2(totals.balanceAmount - settled);

  // Orders, estimates, proforma and challans never carry a payment status.
  const isOpenDoc = meta.partySign === 0 && meta.cashSign === 0;
  const status = isOpenDoc
    ? ('open' as const)
    : deriveStatus(
        totals.totalAmount,
        round2(totals.receivedAmount + settled),
        input.dueDate ?? null,
        today,
      );

  return {
    row: {
      firmId,
      txnType: input.txnType,
      txnNo,
      prefix: meta.prefix,
      partyId: input.partyId,
      partyName: input.partyName ?? null,
      txnDate: input.txnDate,
      dueDate: input.dueDate ?? null,
      refNo: input.refNo ?? null,
      subtotal: String(totals.subtotal),
      discountAmount: String(totals.discountAmount),
      taxAmount: String(totals.taxAmount),
      roundOff: String(totals.roundOff),
      totalAmount: String(totals.totalAmount),
      receivedAmount: String(totals.receivedAmount),
      settledAmount: String(settled),
      balanceAmount: String(balance),
      paymentType: input.paymentType || 'Cash',
      bankAccountId: input.bankAccountId,
      chequeNo: input.chequeNo ?? null,
      expenseCategoryId: input.expenseCategoryId,
      status,
      description: input.description ?? null,
      notes: input.notes ?? null,
      linkedTxnId: input.linkedTxnId,
      transportName: input.transportName ?? null,
      vehicleNumber: input.vehicleNumber ?? null,
      deliveryDate: input.deliveryDate ?? null,
      deliveryLocation: input.deliveryLocation ?? null,
      ewayBillNo: input.ewayBillNo ?? null,
      updatedAt: new Date(),
    },
    lines: totals.lines,
  };
}

function lineValues(txnId: number, lines: ReturnType<typeof computeTotals>['lines']) {
  return lines.map((l, i) => ({
    txnId,
    itemId: l.itemId,
    itemName: l.itemName,
    hsnSac: l.hsnSac,
    quantity: String(l.quantity),
    unit: l.unit,
    pricePerUnit: String(l.pricePerUnit),
    isTaxInclusive: l.isTaxInclusive,
    discountPercent: String(l.discountPercent),
    discountAmount: String(l.discountAmount),
    taxRate: String(l.taxRate),
    taxAmount: String(l.taxAmount),
    total: String(l.total),
    sortOrder: i,
  }));
}

/* ------------------------------------------------------------------ *
 * Create
 * ------------------------------------------------------------------ */

export async function createTransaction(firmId: number, input: TransactionParsed) {
  return db.transaction(async (tx) => {
    const txnNo = input.txnNo ?? (await nextTxnNo(tx, firmId, input.txnType));
    const { row, lines } = buildRow(firmId, input, txnNo);

    const [created] = await tx.insert(transactions).values(row).returning();

    if (lines.length) await tx.insert(transactionItems).values(lineValues(created.id, lines));

    await applyEffects(
      tx,
      created.partyId,
      computeEffects({
        txnType: created.txnType,
        totalAmount: num(created.totalAmount),
        receivedAmount: num(created.receivedAmount),
        lines: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
      }),
    );

    await settleAllocations(tx, created.id, input.allocations ?? []);

    return created;
  });
}

/* ------------------------------------------------------------------ *
 * Update — revert the old posting, then post the new one
 * ------------------------------------------------------------------ */

export async function updateTransaction(firmId: number, id: number, input: TransactionParsed) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.firmId, firmId)))
      .limit(1);
    if (!existing) throw new NotFoundError('Transaction not found');

    const { effects: oldEffects, partyId: oldPartyId } = await effectsOfStored(tx, id);
    await applyEffects(tx, oldPartyId, invertEffects(oldEffects));

    // Settlements made by *other* payment documents survive the edit.
    const { row, lines } = buildRow(
      firmId,
      input,
      input.txnNo ?? existing.txnNo,
      num(existing.settledAmount),
    );

    const [updated] = await tx
      .update(transactions)
      .set(row)
      .where(eq(transactions.id, id))
      .returning();

    await tx.delete(transactionItems).where(eq(transactionItems.txnId, id));
    if (lines.length) await tx.insert(transactionItems).values(lineValues(id, lines));

    await applyEffects(
      tx,
      updated.partyId,
      computeEffects({
        txnType: updated.txnType,
        totalAmount: num(updated.totalAmount),
        receivedAmount: num(updated.receivedAmount),
        lines: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
      }),
    );

    // Re-apply this document's own allocations (relevant when it is a payment).
    const oldAllocs = await tx
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.paymentTxnId, id));
    for (const a of oldAllocs) {
      await bumpInvoiceSettled(tx, a.invoiceTxnId, -num(a.amount));
    }
    await tx.delete(paymentAllocations).where(eq(paymentAllocations.paymentTxnId, id));
    await settleAllocations(tx, id, input.allocations ?? []);

    return updated;
  });
}

/* ------------------------------------------------------------------ *
 * Delete
 * ------------------------------------------------------------------ */

export async function deleteTransaction(firmId: number, id: number) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.firmId, firmId)))
      .limit(1);
    if (!existing) throw new NotFoundError('Transaction not found');

    const { effects, partyId } = await effectsOfStored(tx, id);
    await applyEffects(tx, partyId, invertEffects(effects));

    // Give back whatever this payment had settled before it disappears.
    const allocs = await tx
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.paymentTxnId, id));
    for (const a of allocs) {
      await bumpInvoiceSettled(tx, a.invoiceTxnId, -num(a.amount));
    }

    await tx.delete(transactions).where(eq(transactions.id, id));
    return existing;
  });
}

/** Marks a document cancelled without releasing its number. */
export async function cancelTransaction(firmId: number, id: number) {
  return db.transaction(async (tx) => {
    const { effects, partyId } = await effectsOfStored(tx, id);
    await applyEffects(tx, partyId, invertEffects(effects));
    const [updated] = await tx
      .update(transactions)
      .set({
        status: 'cancelled',
        totalAmount: '0',
        receivedAmount: '0',
        settledAmount: '0',
        balanceAmount: '0',
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, id), eq(transactions.firmId, firmId)))
      .returning();
    return updated;
  });
}

/* ------------------------------------------------------------------ *
 * Payment allocation — a payment-in knocking off open invoices
 * ------------------------------------------------------------------ */

async function settleAllocations(
  tx: Tx,
  paymentTxnId: number,
  allocations: Array<{ invoiceTxnId: number; amount: number }>,
) {
  const usable = allocations.filter((a) => a.invoiceTxnId && num(a.amount) > 0);
  if (!usable.length) return;

  await tx.insert(paymentAllocations).values(
    usable.map((a) => ({
      paymentTxnId,
      invoiceTxnId: a.invoiceTxnId,
      amount: String(round2(num(a.amount))),
    })),
  );

  for (const a of usable) {
    await bumpInvoiceSettled(tx, a.invoiceTxnId, round2(num(a.amount)));
  }
}

/**
 * Moves an invoice's settled/balance/status.
 *
 * Deliberately leaves `receivedAmount` and the party balance alone — the
 * payment document that triggered this already posted its own ledger entry.
 */
async function bumpInvoiceSettled(tx: Tx, invoiceTxnId: number, delta: number) {
  const [inv] = await tx
    .select()
    .from(transactions)
    .where(eq(transactions.id, invoiceTxnId))
    .limit(1);
  if (!inv) return;

  const total = num(inv.totalAmount);
  const received = num(inv.receivedAmount);
  const settled = Math.max(0, Math.min(total - received, round2(num(inv.settledAmount) + delta)));
  const balance = round2(total - received - settled);

  await tx
    .update(transactions)
    .set({
      settledAmount: String(settled),
      balanceAmount: String(balance),
      status: deriveStatus(total, round2(received + settled), inv.dueDate, toISODate()),
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, invoiceTxnId));
}

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

export async function getTransaction(firmId: number, id: number) {
  const [txn] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.firmId, firmId)))
    .limit(1);
  if (!txn) return null;

  const lines = await db
    .select()
    .from(transactionItems)
    .where(eq(transactionItems.txnId, id))
    .orderBy(asc(transactionItems.sortOrder));

  const party = txn.partyId
    ? (await db.select().from(parties).where(eq(parties.id, txn.partyId)).limit(1))[0]
    : null;

  const allocations = await db
    .select()
    .from(paymentAllocations)
    .where(eq(paymentAllocations.paymentTxnId, id));

  return { ...txn, lineItems: lines, party: party ?? null, allocations };
}

export type ListFilters = {
  types?: TxnType[];
  from?: string;
  to?: string;
  partyId?: number;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listTransactions(firmId: number, filters: ListFilters) {
  const where = [eq(transactions.firmId, firmId)];

  if (filters.types?.length) where.push(inArray(transactions.txnType, filters.types));
  if (filters.from) where.push(gte(transactions.txnDate, filters.from));
  if (filters.to) where.push(lte(transactions.txnDate, filters.to));
  if (filters.partyId) where.push(eq(transactions.partyId, filters.partyId));

  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'unpaid') {
      where.push(inArray(transactions.status, ['unpaid', 'overdue', 'partial']));
    } else {
      where.push(eq(transactions.status, filters.status as never));
    }
  }

  if (filters.search) {
    const q = `%${filters.search}%`;
    const searchClause = or(
      ilike(transactions.partyName, q),
      ilike(transactions.refNo, q),
      ilike(transactions.description, q),
      sql`cast(${transactions.txnNo} as text) ilike ${q}`,
    );
    if (searchClause) where.push(searchClause);
  }

  const rows = await db
    .select({ txn: transactions, partyName: parties.name })
    .from(transactions)
    .leftJoin(parties, eq(transactions.partyId, parties.id))
    .where(and(...where))
    .orderBy(desc(transactions.txnDate), desc(transactions.id))
    .limit(filters.limit ?? 500)
    .offset(filters.offset ?? 0);

  return rows.map((r) => ({ ...r.txn, partyName: r.partyName ?? r.txn.partyName }));
}

/** Totals strip shown above every list screen. */
export async function summariseTransactions(firmId: number, filters: ListFilters) {
  const where = [eq(transactions.firmId, firmId)];
  if (filters.types?.length) where.push(inArray(transactions.txnType, filters.types));
  if (filters.from) where.push(gte(transactions.txnDate, filters.from));
  if (filters.to) where.push(lte(transactions.txnDate, filters.to));
  if (filters.partyId) where.push(eq(transactions.partyId, filters.partyId));

  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<string>`coalesce(sum(${transactions.totalAmount}), 0)`,
      received: sql<string>`coalesce(sum(${transactions.receivedAmount} + ${transactions.settledAmount}), 0)`,
      balance: sql<string>`coalesce(sum(${transactions.balanceAmount}), 0)`,
    })
    .from(transactions)
    .where(and(...where));

  return {
    count: row?.count ?? 0,
    total: num(row?.total),
    received: num(row?.received),
    balance: num(row?.balance),
  };
}

export class NotFoundError extends Error {}

/* ------------------------------------------------------------------ *
 * Integrity: rebuild denormalised values from the ledger
 * ------------------------------------------------------------------ */

export async function recalculateBalances(firmId: number) {
  return db.transaction(async (tx) => {
    const allParties = await tx.select().from(parties).where(eq(parties.firmId, firmId));
    const allItems = await tx.select().from(items).where(eq(items.firmId, firmId));
    const allTxns = await tx.select().from(transactions).where(eq(transactions.firmId, firmId));
    const allLines = await tx
      .select({
        txnId: transactionItems.txnId,
        itemId: transactionItems.itemId,
        quantity: transactionItems.quantity,
      })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.txnId, transactions.id))
      .where(eq(transactions.firmId, firmId));

    const linesByTxn = new Map<number, Array<{ itemId: number | null; quantity: number }>>();
    for (const l of allLines) {
      const arr = linesByTxn.get(l.txnId) ?? [];
      arr.push({ itemId: l.itemId, quantity: num(l.quantity) });
      linesByTxn.set(l.txnId, arr);
    }

    const partyBalances = new Map<number, number>();
    for (const p of allParties) {
      const opening =
        p.openingBalanceType === 'to_pay' ? -num(p.openingBalance) : num(p.openingBalance);
      partyBalances.set(p.id, opening);
    }

    const stock = new Map<number, number>();
    for (const it of allItems) stock.set(it.id, num(it.openingStock));

    for (const t of allTxns) {
      if (t.status === 'cancelled') continue;
      const effects = computeEffects({
        txnType: t.txnType,
        totalAmount: num(t.totalAmount),
        receivedAmount: num(t.receivedAmount),
        lines: linesByTxn.get(t.id) ?? [],
      });
      if (t.partyId && partyBalances.has(t.partyId)) {
        partyBalances.set(t.partyId, partyBalances.get(t.partyId)! + effects.partyDelta);
      }
      for (const s of effects.stockDeltas) {
        if (stock.has(s.itemId)) stock.set(s.itemId, stock.get(s.itemId)! + s.delta);
      }
    }

    // Manual stock adjustments sit outside the transaction ledger.
    const adjustments = await tx.execute(sql`
      select item_id, sum(case when type = 'add' then quantity else -quantity end) as delta
      from stock_adjustments where firm_id = ${firmId} group by item_id
    `);
    for (const r of adjustments.rows as unknown as Array<{ item_id: number; delta: string }>) {
      if (stock.has(r.item_id)) stock.set(r.item_id, stock.get(r.item_id)! + num(r.delta));
    }

    for (const [id, bal] of partyBalances) {
      await tx.update(parties).set({ balance: String(round2(bal)) }).where(eq(parties.id, id));
    }
    for (const [id, qty] of stock) {
      await tx.update(items).set({ stockQty: String(qty) }).where(eq(items.id, id));
    }

    return { parties: partyBalances.size, items: stock.size };
  });
}
