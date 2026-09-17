'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, ArrowLeft, Save, Camera, ScanLine } from 'lucide-react';
import clsx from 'clsx';
import {
  useGetPartiesQuery,
  useGetItemsQuery,
  useGetBootstrapQuery,
  useGetBankAccountsQuery,
  useGetNextTxnNoQuery,
  useAddTransactionMutation,
  useUpdateTransactionMutation,
  useGetTransactionsQuery,
} from '@/store/api';
import { Button, Field, Input, Select, Textarea, Checkbox } from '@/components/ui';
import { Combobox } from '@/components/ui/Combobox';
import { PartyFormModal } from '@/components/parties/PartyFormModal';
import { ItemFormModal } from '@/components/items/ItemFormModal';
import { CameraScanModal, type ScanOutcome } from '@/components/items/CameraScanModal';
import { TXN_META, PAYMENT_TYPES, GST_RATES } from '@/lib/constants';
import { codeFromScan, sameItemCode } from '@/lib/item-code';
import {
  computeTotals,
  type DiscountMode,
  type LineComputed,
  type LineInput,
} from '@/lib/calc';
import {
  formatCurrency,
  toISODate,
  num,
  addDays,
  amountInWords,
  round2,
  round3,
} from '@/lib/format';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';
import type { TxnType, TransactionDetail, ItemRow } from '@/types';

/** `discountMode` says which of the two discount inputs a row is showing. */
type FormLine = LineInput & { key: string; discountMode: DiscountMode };

const blankLine = (): FormLine => ({
  key: crypto.randomUUID(),
  itemId: null,
  itemName: '',
  hsnSac: '',
  quantity: '',
  unit: 'Pcs',
  pricePerUnit: '',
  isTaxInclusive: false,
  discountMode: 'percent',
  discountPercent: '',
  discountAmount: '',
  taxRate: '0',
});

/** What a line picks up from an item, whether chosen from the list or scanned. */
const itemLinePatch = (item: ItemRow, purchaseSide: boolean): Partial<FormLine> => ({
  itemId: item.id,
  itemName: item.name,
  hsnSac: item.hsnSac ?? '',
  unit: item.unitShort,
  // Purchases default to the purchase price, sales to the sale price.
  pricePerUnit: purchaseSide ? item.purchasePrice : item.salePrice,
  isTaxInclusive: purchaseSide ? item.purchasePriceTaxInclusive : item.salePriceTaxInclusive,
  taxRate: item.taxRate,
  discountMode: 'percent',
  discountPercent: num(item.discountValue) || '',
  discountAmount: '',
  quantity: '1',
});

/**
 * Entry form for every document type.
 *
 * `source` is the already-loaded document being edited, duplicated or
 * converted. The caller fetches it and keys this component on it, so all the
 * initial state can be built once on mount instead of synced in by effects.
 */
export function TransactionForm({
  txnType,
  editId,
  source,
  convertId,
  presetPartyId,
  presetItem,
}: {
  txnType: TxnType;
  editId?: number;
  source?: TransactionDetail | null;
  convertId?: number;
  presetPartyId?: number;
  /** Starts the first line on this item — used when billing from a scanned label. */
  presetItem?: ItemRow | null;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const meta = TXN_META[txnType];

  const isPayment = txnType === 'payment_in' || txnType === 'payment_out';
  const isExpense = txnType === 'expense';
  const isOpenDoc = meta.partySign === 0 && meta.cashSign === 0;
  const isPurchaseSide =
    txnType === 'purchase' || txnType === 'purchase_order' || txnType === 'debit_note';

  /* ----------------------------- data ----------------------------- */
  const { data: parties = [] } = useGetPartiesQuery();
  const { data: items = [] } = useGetItemsQuery({ active: 'true' });
  const { data: bootstrap } = useGetBootstrapQuery();
  const { data: banks = [] } = useGetBankAccountsQuery();
  const { data: nextNo } = useGetNextTxnNoQuery(txnType, { skip: Boolean(editId) });

  const [addTransaction, { isLoading: adding }] = useAddTransactionMutation();
  const [updateTransaction, { isLoading: updating }] = useUpdateTransactionMutation();

  /* ----------------------------- state ---------------------------- */
  const [partyId, setPartyId] = useState<number | null>(source?.partyId ?? presetPartyId ?? null);
  const [partyName, setPartyName] = useState(source?.party?.name ?? source?.partyName ?? '');
  // Null until the user types a number of their own; otherwise derived below.
  const [txnNoOverride, setTxnNo] = useState<number | '' | null>(null);
  const [txnDate, setTxnDate] = useState(() =>
    editId && source ? source.txnDate : toISODate(),
  );
  const [dueDateOverride, setDueDateOverride] = useState<string | null>(
    editId && source ? (source.dueDate ?? null) : null,
  );
  const [paymentTerms, setPaymentTerms] = useState('0');
  const [refNo, setRefNo] = useState(source?.refNo ?? '');
  const [lines, setLines] = useState<FormLine[]>(() =>
    source?.lineItems?.length
      ? source.lineItems.map((l) => ({
          key: crypto.randomUUID(),
          itemId: l.itemId,
          itemName: l.itemName,
          hsnSac: l.hsnSac ?? '',
          quantity: l.quantity,
          unit: l.unit ?? 'Pcs',
          pricePerUnit: l.pricePerUnit,
          isTaxInclusive: l.isTaxInclusive,
          // Reopen on the figure that was typed, not on its derived twin.
          discountMode: l.discountMode === 'amount' ? 'amount' : 'percent',
          discountPercent: l.discountMode === 'amount' ? '' : l.discountPercent,
          discountAmount: l.discountMode === 'amount' ? l.discountAmount : '',
          taxRate: l.taxRate,
        }))
      : presetItem
        ? [{ ...blankLine(), ...itemLinePatch(presetItem, isPurchaseSide) }]
        : [blankLine()],
  );
  const [invoiceDiscountMode, setInvoiceDiscountMode] = useState<DiscountMode>(
    source?.invoiceDiscountMode === 'amount' ? 'amount' : 'percent',
  );
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(() =>
    source && num(source.invoiceDiscountValue) > 0 ? String(num(source.invoiceDiscountValue)) : '',
  );
  const [additionalCharges, setAdditionalCharges] = useState('');
  const [roundOffEnabled, setRoundOffEnabled] = useState(
    source ? num(source.roundOff) !== 0 : true,
  );
  const [receivedAmount, setReceivedAmount] = useState(
    editId && source ? source.receivedAmount : '',
  );
  const [paymentAmount, setPaymentAmount] = useState(
    isPayment && source ? source.totalAmount : '',
  );
  const [paymentType, setPaymentType] = useState(source?.paymentType ?? 'Cash');
  const [bankAccountId, setBankAccountId] = useState<number | null>(source?.bankAccountId ?? null);
  const [expenseCategoryId, setExpenseCategoryId] = useState<number | null>(
    source?.expenseCategoryId ?? null,
  );
  const [description, setDescription] = useState(source?.description ?? '');
  const [notes, setNotes] = useState(source?.notes ?? '');
  const [fullyPaid, setFullyPaid] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [pendingLineKey, setPendingLineKey] = useState<string | null>(null);
  const [scanText, setScanText] = useState('');
  const [lastScan, setLastScan] = useState<ScanOutcome | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  /* --------------------------- derived ---------------------------- */
  // Editing keeps the stored number; a new document takes the next free one.
  const txnNo: number | '' =
    txnNoOverride ?? (editId && source ? source.txnNo : (nextNo?.txnNo ?? ''));

  // Payment terms drive the due date until the user picks one explicitly.
  const termDays = Number(paymentTerms);
  const dueDate =
    dueDateOverride ??
    (isPayment || isOpenDoc
      ? ''
      : Number.isFinite(termDays) && termDays > 0
        ? addDays(txnDate, termDays)
        : txnDate);

  const totals = useMemo(
    () =>
      computeTotals({
        lines: lines.filter((l) => l.itemName.trim()),
        invoiceDiscountMode,
        invoiceDiscountPercent: invoiceDiscountMode === 'percent' ? invoiceDiscountValue : 0,
        invoiceDiscountAmount: invoiceDiscountMode === 'amount' ? invoiceDiscountValue : 0,
        additionalCharges,
        roundOffEnabled,
        receivedAmount: fullyPaid ? Number.MAX_SAFE_INTEGER : receivedAmount,
      }),
    [
      lines,
      invoiceDiscountMode,
      invoiceDiscountValue,
      additionalCharges,
      roundOffEnabled,
      receivedAmount,
      fullyPaid,
    ],
  );

  const partyOptions = useMemo(
    () =>
      parties.map((p) => ({
        value: p.id,
        label: p.name,
        hint: p.phone ?? undefined,
        meta:
          num(p.balance) !== 0
            ? `${num(p.balance) > 0 ? 'Recv' : 'Pay'} ${formatCurrency(Math.abs(num(p.balance)), {
                symbol: false,
              })}`
            : undefined,
      })),
    [parties],
  );

  const itemOptions = useMemo(
    () =>
      items.map((i) => ({
        value: i.id,
        label: i.name,
        hint: i.itemCode ?? undefined,
        // The price this line would actually pick up, so the user can compare
        // before choosing; stock sits underneath it for products.
        meta: formatCurrency(isPurchaseSide ? i.purchasePrice : i.salePrice),
        metaHint: i.type === 'product' ? `${num(i.stockQty)} ${i.unitShort}` : undefined,
      })),
    [items, isPurchaseSide],
  );

  // Open invoices this payment can be settled against.
  const settleType = txnType === 'payment_in' ? 'sale' : 'purchase';
  const { data: openInvoices } = useGetTransactionsQuery(
    { types: settleType, partyId: partyId ?? undefined, status: 'unpaid', limit: 100 },
    { skip: !isPayment || !partyId },
  );
  const [allocations, setAllocations] = useState<Record<number, string>>({});

  /* --------------------------- handlers --------------------------- */
  const setLine = (key: string, patch: Partial<FormLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  /** The one discount box a row shows, whichever mode it is in. */
  const lineDiscountValue = (line: FormLine) =>
    String((line.discountMode === 'amount' ? line.discountAmount : line.discountPercent) ?? '');

  const setLineDiscount = (line: FormLine, value: string) =>
    setLine(
      line.key,
      line.discountMode === 'amount'
        ? { discountAmount: value, discountPercent: '' }
        : { discountPercent: value, discountAmount: '' },
    );

  /**
   * Switching % to rupees (or back) carries the already-computed equivalent
   * across, so the money on the row does not jump under the user.
   */
  const setLineDiscountMode = (
    line: FormLine,
    computed: LineComputed | undefined,
    mode: DiscountMode,
  ) => {
    if (mode === line.discountMode) return;
    const carried =
      mode === 'amount' ? (computed?.discountAmount ?? 0) : (computed?.discountPercent ?? 0);
    const value = carried > 0 ? String(carried) : '';
    setLine(line.key, {
      discountMode: mode,
      discountPercent: mode === 'percent' ? value : '',
      discountAmount: mode === 'amount' ? value : '',
    });
  };

  const changeInvoiceDiscountMode = (mode: DiscountMode) => {
    if (mode === invoiceDiscountMode) return;
    const carried =
      mode === 'amount'
        ? totals.invoiceDiscount
        : totals.subtotal > 0
          ? round2((totals.invoiceDiscount / totals.subtotal) * 100)
          : 0;
    setInvoiceDiscountMode(mode);
    setInvoiceDiscountValue(carried > 0 ? String(carried) : '');
  };

  const pickItem = (key: string, itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    setLine(key, itemLinePatch(item, isPurchaseSide));
  };

  // On by default; Settings → Item → Barcode scanning turns the scan bar off.
  const scanEnabled = !isExpense && bootstrap?.settings?.item_barcode_enabled !== 'false';

  /**
   * A scanned label (USB scanner, camera or typed code) adds one unit: onto the
   * line already holding that item, else into the first empty row, else a new row.
   */
  const addScanned = (scanned: string): ScanOutcome | undefined => {
    const code = codeFromScan(scanned);
    if (!code) return undefined;
    const item = items.find((i) => sameItemCode(i.itemCode, code));
    const outcome: ScanOutcome = item
      ? { ok: true, message: '' }
      : { ok: false, message: `No active item has the code "${code}"` };

    if (item) {
      const existing = lines.find((l) => l.itemId === item.id);
      const qty = existing ? round3(num(existing.quantity) + 1) : 1;
      outcome.message = `${item.name} × ${qty}`;
      setLines((ls) => {
        const same = ls.find((l) => l.itemId === item.id);
        if (same) {
          return ls.map((l) =>
            l.key === same.key ? { ...l, quantity: String(round3(num(l.quantity) + 1)) } : l,
          );
        }
        const empty = ls.find((l) => !l.itemName.trim());
        const patch = itemLinePatch(item, isPurchaseSide);
        return empty
          ? ls.map((l) => (l.key === empty.key ? { ...l, ...patch } : l))
          : [...ls, { ...blankLine(), ...patch }];
      });
      setErrors((e) => ({ ...e, lines: '' }));
    }

    setLastScan(outcome);
    return outcome;
  };

  const addLine = () => setLines((ls) => [...ls, blankLine()]);
  const removeLine = (key: string) =>
    setLines((ls) => (ls.length === 1 ? [blankLine()] : ls.filter((l) => l.key !== key)));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!partyId && !partyName.trim()) next.party = 'Select or type a party name';
    if (!txnDate) next.txnDate = 'Date is required';

    if (isPayment) {
      if (num(paymentAmount) <= 0) next.amount = 'Enter an amount greater than zero';
    } else {
      const filled = lines.filter((l) => l.itemName.trim());
      if (!filled.length) next.lines = 'Add at least one item';
      else if (filled.some((l) => num(l.quantity) <= 0)) next.lines = 'Every line needs a quantity';
    }

    if (isExpense && !expenseCategoryId) next.category = 'Choose an expense category';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = () => {
    const allocationList = Object.entries(allocations)
      .map(([id, amount]) => ({ invoiceTxnId: Number(id), amount: num(amount) }))
      .filter((a) => a.amount > 0);

    return {
      txnType,
      partyId,
      partyName: partyId ? (parties.find((p) => p.id === partyId)?.name ?? partyName) : partyName,
      txnNo: txnNo === '' ? undefined : Number(txnNo),
      txnDate,
      dueDate: isPayment || isOpenDoc ? null : dueDate || null,
      refNo: refNo || null,
      lines: isPayment
        ? []
        : lines.filter((l) => l.itemName.trim()).map((l) => ({ ...l, key: undefined })),
      invoiceDiscountMode,
      invoiceDiscountPercent: invoiceDiscountMode === 'percent' ? num(invoiceDiscountValue) : 0,
      invoiceDiscountAmount: invoiceDiscountMode === 'amount' ? num(invoiceDiscountValue) : 0,
      additionalCharges: num(additionalCharges),
      roundOffEnabled,
      totalAmount: isPayment ? num(paymentAmount) : undefined,
      receivedAmount: isPayment
        ? num(paymentAmount)
        : fullyPaid
          ? totals.totalAmount
          : num(receivedAmount),
      paymentType,
      bankAccountId: paymentType === 'Cash' ? null : bankAccountId,
      expenseCategoryId,
      description: description || null,
      notes: notes || null,
      linkedTxnId: convertId ?? null,
      allocations: allocationList,
    };
  };

  const save = async (andNew = false) => {
    if (!validate()) {
      dispatch(pushToast('Please fix the highlighted fields', 'error'));
      return;
    }

    try {
      const payload = buildPayload();
      if (editId) {
        await updateTransaction({ id: editId, body: payload }).unwrap();
        dispatch(pushToast(`${meta.label} updated`, 'success'));
        router.push(`/txn/${editId}`);
      } else {
        const saved = await addTransaction(payload).unwrap();
        dispatch(pushToast(`${meta.label} #${saved.txnNo} saved`, 'success'));
        if (andNew) {
          resetForm();
        } else {
          router.push(`/txn/${saved.id}`);
        }
      }
    } catch (err) {
      dispatch(
        pushToast(
          (err as { data?: { error?: string } })?.data?.error ?? `Could not save this ${meta.label}`,
          'error',
        ),
      );
    }
  };

  const resetForm = () => {
    setPartyId(null);
    setPartyName('');
    setLines([blankLine()]);
    setReceivedAmount('');
    setPaymentAmount('');
    setInvoiceDiscountMode('percent');
    setInvoiceDiscountValue('');
    setAdditionalCharges('');
    setDescription('');
    setNotes('');
    setAllocations({});
    setFullyPaid(false);
    setTxnNo(typeof txnNo === 'number' ? txnNo + 1 : null);
    setDueDateOverride(null);
  };

  /* ---------------------------- render ---------------------------- */
  return (
    <div className="flex h-full flex-col bg-canvas">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-5 py-3">
        <button
          onClick={() => router.back()}
          className="rounded-full p-1.5 text-ink-soft transition hover:bg-canvas"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-ink">
          {editId ? `Edit ${meta.label}` : meta.label}
        </h1>

        <div className="ml-auto flex items-center gap-2">
          {!editId && (
            <Button variant="secondary" onClick={() => save(true)} loading={adding}>
              Save & New
            </Button>
          )}
          <Button icon={<Save size={16} />} onClick={() => save(false)} loading={adding || updating}>
            Save
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          {/* Party & document meta */}
          <div className="card p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Field
                label={isPurchaseSide || txnType === 'payment_out' ? 'Supplier' : 'Customer'}
                required
                error={errors.party}
                className="md:col-span-2"
              >
                <Combobox
                  value={partyId}
                  options={partyOptions}
                  placeholder="Search or add a party"
                  allowFreeText
                  onCreate={() => setPartyModalOpen(true)}
                  createLabel="Add new party"
                  onChange={(v, _o, text) => {
                    setPartyId(typeof v === 'number' ? v : null);
                    setPartyName(text);
                    setErrors((e) => ({ ...e, party: '' }));
                  }}
                />
              </Field>

              <Field label={isPayment ? 'Receipt No.' : `${meta.label} No.`}>
                <Input
                  type="number"
                  value={txnNo}
                  onChange={(e) => setTxnNo(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </Field>

              <Field label="Date" required error={errors.txnDate}>
                <Input
                  type="date"
                  value={txnDate}
                  onChange={(e) => setTxnDate(e.target.value)}
                />
              </Field>

              {!isPayment && !isOpenDoc && (
                <>
                  <Field label="Payment Terms (days)">
                    <Input
                      type="number"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                    />
                  </Field>
                  <Field label="Due Date">
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDateOverride(e.target.value)}
                    />
                  </Field>
                </>
              )}

              <Field label="Reference No.">
                <Input
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              {isExpense && (
                <Field label="Expense Category" required error={errors.category}>
                  <Select
                    value={expenseCategoryId ?? ''}
                    onChange={(e) =>
                      setExpenseCategoryId(e.target.value ? Number(e.target.value) : null)
                    }
                  >
                    <option value="">Select category</option>
                    {bootstrap?.expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </div>

          {/* Payment document */}
          {isPayment ? (
            <div className="card p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Amount" required error={errors.amount}>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                  />
                </Field>
                <Field label="Payment Type">
                  <Select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                    {PAYMENT_TYPES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>
                {paymentType !== 'Cash' && (
                  <Field label="Bank Account">
                    <Select
                      value={bankAccountId ?? ''}
                      onChange={(e) =>
                        setBankAccountId(e.target.value ? Number(e.target.value) : null)
                      }
                    >
                      <option value="">Select account</option>
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.accountName}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
              </div>

              {/* Settle against open invoices */}
              {!!openInvoices?.transactions.length && (
                <div className="mt-5">
                  <h3 className="mb-2 text-[13.5px] font-semibold text-ink">
                    Settle against open {settleType === 'sale' ? 'invoices' : 'bills'}
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-line">
                    <table className="w-full text-[13px]">
                      <thead className="bg-canvas text-ink-soft">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">No.</th>
                          <th className="px-3 py-2 text-left font-medium">Date</th>
                          <th className="px-3 py-2 text-right font-medium">Total</th>
                          <th className="px-3 py-2 text-right font-medium">Due</th>
                          <th className="px-3 py-2 text-right font-medium">Settle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openInvoices.transactions.map((inv) => (
                          <tr key={inv.id} className="border-t border-line">
                            <td className="px-3 py-2">#{inv.txnNo}</td>
                            <td className="px-3 py-2">{inv.txnDate}</td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(inv.totalAmount)}
                            </td>
                            <td className="px-3 py-2 text-right text-danger">
                              {formatCurrency(inv.balanceAmount)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Input
                                type="number"
                                value={allocations[inv.id] ?? ''}
                                onChange={(e) =>
                                  setAllocations((a) => ({ ...a, [inv.id]: e.target.value }))
                                }
                                placeholder="0"
                                className="ml-auto h-8 w-28 text-right"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[12px] text-ink-faint">
                    Leave blank to keep the payment as an on-account credit.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Line items */
            <div className="card overflow-hidden">
              {scanEnabled && (
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
                  <ScanLine size={16} className="shrink-0 text-ink-faint" />
                  <Input
                    value={scanText}
                    onChange={(e) => setScanText(e.target.value)}
                    onKeyDown={(e) => {
                      // Scanners type the code and press Enter.
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      addScanned(scanText);
                      setScanText('');
                    }}
                    placeholder="Scan QR / barcode, or type an item code and press Enter"
                    aria-label="Scan item"
                    className="h-8.5 min-w-0 flex-1 sm:max-w-sm"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Camera size={14} />}
                    onClick={() => setCameraOpen(true)}
                  >
                    Camera
                  </Button>
                  {lastScan && (
                    <span
                      className={clsx(
                        'text-[12.5px]',
                        lastScan.ok ? 'text-success' : 'text-danger',
                      )}
                    >
                      {lastScan.message}
                    </span>
                  )}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-[13px]">
                  <thead className="bg-canvas text-ink-soft">
                    <tr>
                      <th className="w-10 px-3 py-2.5 text-left font-medium">#</th>
                      <th className="min-w-56 px-3 py-2.5 text-left font-medium">ITEM</th>
                      <th className="w-28 px-3 py-2.5 text-left font-medium">HSN</th>
                      <th className="w-24 px-3 py-2.5 text-right font-medium">QTY</th>
                      <th className="w-20 px-3 py-2.5 text-left font-medium">UNIT</th>
                      <th className="w-32 px-3 py-2.5 text-right font-medium">PRICE/UNIT</th>
                      <th className="w-40 px-3 py-2.5 text-right font-medium">DISCOUNT</th>
                      <th className="w-28 px-3 py-2.5 text-right font-medium">TAX</th>
                      <th className="w-32 px-3 py-2.5 text-right font-medium">AMOUNT</th>
                      <th className="w-10 px-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => {
                      const computed = totals.lines[
                        lines.filter((l, i) => i < index && l.itemName.trim()).length
                      ];
                      const amount = line.itemName.trim() ? (computed?.total ?? 0) : 0;

                      return (
                        <tr key={line.key} className="border-t border-line align-top">
                          <td className="px-3 py-2 text-ink-faint">{index + 1}</td>
                          <td className="px-2 py-1.5">
                            <Combobox
                              value={line.itemId ?? null}
                              options={itemOptions}
                              placeholder="Search or type an item"
                              allowFreeText
                              onCreate={() => {
                                setPendingLineKey(line.key);
                                setItemModalOpen(true);
                              }}
                              createLabel="Add new item"
                              inputClassName="h-8.5"
                              onChange={(v, _o, text) => {
                                if (typeof v === 'number') pickItem(line.key, v);
                                else setLine(line.key, { itemId: null, itemName: text });
                                setErrors((e) => ({ ...e, lines: '' }));
                              }}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              value={line.hsnSac ?? ''}
                              onChange={(e) => setLine(line.key, { hsnSac: e.target.value })}
                              className="h-8.5"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              value={String(line.quantity ?? '')}
                              onChange={(e) => setLine(line.key, { quantity: e.target.value })}
                              className="h-8.5 text-right"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              value={line.unit ?? ''}
                              onChange={(e) => setLine(line.key, { unit: e.target.value })}
                              className="h-8.5"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              value={String(line.pricePerUnit ?? '')}
                              onChange={(e) => setLine(line.key, { pricePerUnit: e.target.value })}
                              className="h-8.5 text-right"
                            />
                            <label className="mt-1 flex items-center gap-1 text-[11px] text-ink-faint">
                              <input
                                type="checkbox"
                                checked={Boolean(line.isTaxInclusive)}
                                onChange={(e) =>
                                  setLine(line.key, { isTaxInclusive: e.target.checked })
                                }
                                className="h-3 w-3 accent-[var(--color-accent)]"
                              />
                              incl. tax
                            </label>
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={lineDiscountValue(line)}
                                onChange={(e) => setLineDiscount(line, e.target.value)}
                                className="h-8.5 text-right"
                              />
                              <DiscountModeToggle
                                mode={line.discountMode}
                                onChange={(m) => setLineDiscountMode(line, computed, m)}
                                className="h-8.5"
                              />
                            </div>
                            {computed && computed.discountAmount > 0 && (
                              <p className="mt-1 text-right text-[11px] text-ink-faint">
                                {line.discountMode === 'percent'
                                  ? '−' +
                                    formatCurrency(computed.discountAmount, { symbol: false })
                                  : computed.discountPercent + '%'}
                              </p>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <Select
                              value={String(line.taxRate ?? '0')}
                              onChange={(e) => setLine(line.key, { taxRate: e.target.value })}
                              className="h-8.5"
                            >
                              {GST_RATES.map((r) => (
                                <option key={r} value={r}>
                                  {r}%
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-ink">
                            {formatCurrency(amount)}
                          </td>
                          <td className="px-2 py-2">
                            <button
                              onClick={() => removeLine(line.key)}
                              className="text-ink-faint transition hover:text-danger"
                              aria-label="Remove line"
                            >
                              <X size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
                <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={addLine}>
                  Add Row
                </Button>
                {errors.lines && <span className="text-[12.5px] text-danger">{errors.lines}</span>}
                <span className="text-[13px] text-ink-soft">
                  {totals.lines.length} item{totals.lines.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          )}

          {/* Totals + payment */}
          {!isPayment && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="card flex flex-col gap-4 p-4">
                <Field label="Description">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Shown on the printed document"
                  />
                </Field>

                {!isOpenDoc && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Payment Type">
                      <Select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                        {PAYMENT_TYPES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    {paymentType !== 'Cash' && (
                      <Field label="Bank Account">
                        <Select
                          value={bankAccountId ?? ''}
                          onChange={(e) =>
                            setBankAccountId(e.target.value ? Number(e.target.value) : null)
                          }
                        >
                          <option value="">Select account</option>
                          {banks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.accountName}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    )}
                  </div>
                )}

                {totals.totalAmount > 0 && (
                  <p className="rounded-lg bg-canvas px-3 py-2 text-[12.5px] text-ink-soft">
                    {amountInWords(totals.totalAmount)}
                  </p>
                )}
              </div>

              <div className="card flex flex-col gap-2.5 p-4">
                <TotalRow label="Subtotal" value={totals.subtotal} />

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] text-ink-soft">Discount</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      value={invoiceDiscountValue}
                      onChange={(e) => setInvoiceDiscountValue(e.target.value)}
                      placeholder="0"
                      className="h-8 w-16 text-right"
                    />
                    <DiscountModeToggle
                      mode={invoiceDiscountMode}
                      onChange={changeInvoiceDiscountMode}
                    />
                    <span className="w-20 text-right text-[13px] text-ink">
                      −{formatCurrency(totals.invoiceDiscount, { symbol: false })}
                    </span>
                  </div>
                </div>

                <TotalRow label="Tax" value={totals.taxAmount} />

                {totals.taxBreakup
                  .filter((t) => t.rate > 0)
                  .map((t) => (
                    <div
                      key={t.rate}
                      className="flex justify-between pl-3 text-[12px] text-ink-faint"
                    >
                      <span>
                        CGST {t.rate / 2}% + SGST {t.rate / 2}%
                      </span>
                      <span>{formatCurrency(t.taxAmount, { symbol: false })}</span>
                    </div>
                  ))}

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] text-ink-soft">Additional Charges</span>
                  <Input
                    type="number"
                    value={additionalCharges}
                    onChange={(e) => setAdditionalCharges(e.target.value)}
                    placeholder="0"
                    className="h-8 w-28 text-right"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Checkbox
                    checked={roundOffEnabled}
                    onChange={setRoundOffEnabled}
                    label="Round Off"
                  />
                  <span className="text-[13px] text-ink">
                    {formatCurrency(totals.roundOff, { symbol: false })}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between border-t border-line pt-3">
                  <span className="text-[14px] font-semibold text-ink">Total</span>
                  <span className="text-[17px] font-semibold text-ink">
                    {formatCurrency(totals.totalAmount)}
                  </span>
                </div>

                {!isOpenDoc && (
                  <>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[13px] text-ink-soft">
                        {isPurchaseSide || isExpense ? 'Paid' : 'Received'}
                      </span>
                      <Input
                        type="number"
                        value={fullyPaid ? String(totals.totalAmount) : receivedAmount}
                        disabled={fullyPaid}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        placeholder="0"
                        className="h-8 w-32 text-right"
                      />
                    </div>

                    <Checkbox
                      checked={fullyPaid}
                      onChange={(v) => {
                        setFullyPaid(v);
                        if (v) setReceivedAmount(String(totals.totalAmount));
                      }}
                      label="Mark as fully paid"
                    />

                    <div className="flex items-center justify-between border-t border-line pt-2.5">
                      <span className="text-[13px] font-medium text-ink-soft">Balance Due</span>
                      <span
                        className={`text-[15px] font-semibold ${
                          totals.balanceAmount > 0 ? 'text-danger' : 'text-success'
                        }`}
                      >
                        {formatCurrency(totals.balanceAmount)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {isPayment && (
            <div className="card p-4">
              <Field label="Description">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
          )}
        </div>
      </div>

      {partyModalOpen && (
        <PartyFormModal
          open
          onClose={() => setPartyModalOpen(false)}
          onSaved={(p) => {
            setPartyId(p.id);
            setPartyName(p.name);
          }}
        />
      )}

      {cameraOpen && (
        <CameraScanModal
          continuous
          title="Scan items"
          onClose={() => setCameraOpen(false)}
          onScan={addScanned}
        />
      )}

      {itemModalOpen && (
        <ItemFormModal
          open
          onClose={() => setItemModalOpen(false)}
          onSaved={(i) => {
            if (pendingLineKey) {
              setLine(pendingLineKey, {
                itemId: i.id,
                itemName: i.name,
                hsnSac: i.hsnSac ?? '',
                pricePerUnit: isPurchaseSide ? i.purchasePrice : i.salePrice,
                taxRate: i.taxRate,
                quantity: '1',
              });
              setPendingLineKey(null);
            }
          }}
        />
      )}
    </div>
  );
}

/** The % / rupee switch that sits beside every discount box. */
function DiscountModeToggle({
  mode,
  onChange,
  className,
}: {
  mode: DiscountMode;
  onChange: (mode: DiscountMode) => void;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'inline-flex h-8 shrink-0 overflow-hidden rounded-lg border border-line-strong bg-white',
        className,
      )}
    >
      {(['percent', 'amount'] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          aria-label={m === 'percent' ? 'Discount in percent' : 'Discount in rupees'}
          onClick={() => onChange(m)}
          className={clsx(
            'h-full w-6.5 text-[12px] font-medium transition-colors',
            mode === m ? 'bg-accent text-white' : 'text-ink-faint hover:bg-canvas',
          )}
        >
          {m === 'percent' ? '%' : '₹'}
        </button>
      ))}
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-ink-soft">{label}</span>
      <span className="text-ink">{formatCurrency(value, { symbol: false })}</span>
    </div>
  );
}
