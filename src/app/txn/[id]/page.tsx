'use client';

import { use, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, Pencil, Trash2, Share2, Copy } from 'lucide-react';
import {
  useGetTransactionQuery,
  useGetBootstrapQuery,
  useDeleteTransactionMutation,
} from '@/store/api';
import { Button, Spinner, ConfirmDialog } from '@/components/ui';
import { StatusPill } from '@/components/ui/StatusPill';
import { TXN_META } from '@/lib/constants';
import { formatCurrency, formatDate, formatQty, num, amountInWords } from '@/lib/format';
import { isIntraState, splitGST, splitStoredTotals } from '@/lib/calc';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';
import { useState } from 'react';

export default function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<Spinner />}>
      <TransactionView id={Number(id)} />
    </Suspense>
  );
}

function TransactionView({ id }: { id: number }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();

  const { data: txn, isLoading } = useGetTransactionQuery(id);
  const { data: bootstrap } = useGetBootstrapQuery();
  const [deleteTxn, { isLoading: deleting }] = useDeleteTransactionMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // /txn/123?print=1 jumps straight to the print dialog.
  useEffect(() => {
    if (searchParams.get('print') && txn) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [searchParams, txn]);

  if (isLoading || !txn) return <Spinner label="Loading document…" />;

  const meta = TXN_META[txn.txnType];
  const firm = bootstrap?.firm;
  const intraState = isIntraState(firm?.state, txn.party?.state);

  const figures = splitStoredTotals(txn, txn.lineItems);

  const taxByRate = new Map<number, { taxable: number; tax: number }>();
  for (const l of txn.lineItems) {
    const rate = num(l.taxRate);
    const bucket = taxByRate.get(rate) ?? { taxable: 0, tax: 0 };
    bucket.taxable += num(l.total) - num(l.taxAmount);
    bucket.tax += num(l.taxAmount);
    taxByRate.set(rate, bucket);
  }

  const doDelete = async () => {
    try {
      await deleteTxn(id).unwrap();
      dispatch(pushToast(`${meta.label} deleted`, 'success'));
      router.push(`/${meta.route}`);
    } catch (err) {
      dispatch(
        pushToast(
          (err as { data?: { error?: string } })?.data?.error ?? 'Could not delete',
          'error',
        ),
      );
    }
  };

  const share = async () => {
    const url = window.location.href.replace(/\?.*$/, '');
    try {
      if (navigator.share) {
        await navigator.share({ title: `${meta.label} #${txn.txnNo}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        dispatch(pushToast('Link copied to clipboard', 'success'));
      }
    } catch {
      /* the user dismissed the share sheet */
    }
  };

  return (
    <div className="min-h-full bg-canvas">
      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-line bg-white px-5 py-3">
        <button
          onClick={() => router.back()}
          className="rounded-full p-1.5 text-ink-soft transition hover:bg-canvas"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-ink">
          {meta.label} #{txn.txnNo}
        </h1>
        <StatusPill status={txn.status} dueDate={txn.dueDate} />

        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Share2 size={15} />} onClick={share}>
            Share
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Copy size={15} />}
            onClick={() => router.push(`/txn/new/${txn.txnType}?duplicate=${txn.id}`)}
          >
            Duplicate
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Pencil size={15} />}
            onClick={() => router.push(`/txn/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Trash2 size={15} />}
            className="text-danger"
            onClick={() => setConfirmOpen(true)}
          >
            Delete
          </Button>
          <Button size="sm" icon={<Printer size={15} />} onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      {/* Printable sheet */}
      <div className="p-4">
        <div className="print-sheet mx-auto max-w-4xl bg-white p-8 shadow-sm ring-1 ring-line">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
            <div>
              <h2 className="text-xl font-bold text-ink">{firm?.name ?? 'My Company'}</h2>
              {firm?.address && (
                <p className="mt-1 max-w-xs text-[12.5px] leading-snug text-ink-soft">
                  {firm.address}
                </p>
              )}
              <div className="mt-1 space-y-0.5 text-[12.5px] text-ink-soft">
                {firm?.phone && <p>Phone: {firm.phone}</p>}
                {firm?.email && <p>Email: {firm.email}</p>}
                {firm?.gstin && <p>GSTIN: {firm.gstin}</p>}
                {firm?.state && <p>State: {firm.state}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[15px] font-bold uppercase tracking-wide text-ink">
                {meta.label}
              </p>
              <p className="mt-1 text-[12.5px] text-ink-soft">
                No: <span className="font-medium text-ink">{txn.txnNo}</span>
              </p>
              <p className="text-[12.5px] text-ink-soft">
                Date: <span className="font-medium text-ink">{formatDate(txn.txnDate)}</span>
              </p>
              {txn.dueDate && (
                <p className="text-[12.5px] text-ink-soft">
                  Due: <span className="font-medium text-ink">{formatDate(txn.dueDate)}</span>
                </p>
              )}
              {txn.refNo && (
                <p className="text-[12.5px] text-ink-soft">
                  Ref: <span className="font-medium text-ink">{txn.refNo}</span>
                </p>
              )}
            </div>
          </div>

          {/* Party block */}
          <div className="grid gap-6 border-b border-line py-4 sm:grid-cols-2">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                Bill To
              </p>
              <p className="mt-1 text-[14px] font-semibold text-ink">
                {txn.party?.name ?? txn.partyName ?? '—'}
              </p>
              {txn.party?.billingAddress && (
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
                  {txn.party.billingAddress}
                </p>
              )}
              {txn.party?.phone && (
                <p className="text-[12.5px] text-ink-soft">Contact: {txn.party.phone}</p>
              )}
              {txn.party?.gstin && (
                <p className="text-[12.5px] text-ink-soft">GSTIN: {txn.party.gstin}</p>
              )}
            </div>

            {(txn.transportName || txn.vehicleNumber || txn.deliveryLocation) && (
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                  Transport
                </p>
                {txn.transportName && (
                  <p className="mt-1 text-[12.5px] text-ink-soft">{txn.transportName}</p>
                )}
                {txn.vehicleNumber && (
                  <p className="text-[12.5px] text-ink-soft">Vehicle: {txn.vehicleNumber}</p>
                )}
                {txn.deliveryLocation && (
                  <p className="text-[12.5px] text-ink-soft">To: {txn.deliveryLocation}</p>
                )}
              </div>
            )}
          </div>

          {/* Lines */}
          {txn.lineItems.length > 0 ? (
            <table className="mt-4 w-full text-[12.5px]">
              <thead>
                <tr className="bg-canvas text-ink-soft">
                  <th className="border border-line px-2 py-1.5 text-left font-semibold">#</th>
                  <th className="border border-line px-2 py-1.5 text-left font-semibold">
                    Item Name
                  </th>
                  <th className="border border-line px-2 py-1.5 text-left font-semibold">
                    HSN/SAC
                  </th>
                  <th className="border border-line px-2 py-1.5 text-right font-semibold">Qty</th>
                  <th className="border border-line px-2 py-1.5 text-left font-semibold">Unit</th>
                  <th className="border border-line px-2 py-1.5 text-right font-semibold">
                    Price/Unit
                  </th>
                  <th className="border border-line px-2 py-1.5 text-right font-semibold">Disc.</th>
                  <th className="border border-line px-2 py-1.5 text-right font-semibold">GST</th>
                  <th className="border border-line px-2 py-1.5 text-right font-semibold">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {txn.lineItems.map((l, i) => (
                  <tr key={l.id}>
                    <td className="border border-line px-2 py-1.5">{i + 1}</td>
                    <td className="border border-line px-2 py-1.5">{l.itemName}</td>
                    <td className="border border-line px-2 py-1.5">{l.hsnSac ?? ''}</td>
                    <td className="border border-line px-2 py-1.5 text-right">
                      {formatQty(l.quantity)}
                    </td>
                    <td className="border border-line px-2 py-1.5">{l.unit}</td>
                    <td className="border border-line px-2 py-1.5 text-right">
                      {formatCurrency(l.pricePerUnit, { symbol: false })}
                    </td>
                    <td className="border border-line px-2 py-1.5 text-right">
                      {num(l.discountAmount)
                        ? formatCurrency(l.discountAmount, { symbol: false })
                        : '—'}
                    </td>
                    <td className="border border-line px-2 py-1.5 text-right">
                      {num(l.taxRate)}% ({formatCurrency(l.taxAmount, { symbol: false })})
                    </td>
                    <td className="border border-line px-2 py-1.5 text-right font-medium">
                      {formatCurrency(l.total, { symbol: false })}
                    </td>
                  </tr>
                ))}
                <tr className="bg-canvas font-semibold">
                  <td className="border border-line px-2 py-1.5" colSpan={3}>
                    Total
                  </td>
                  <td className="border border-line px-2 py-1.5 text-right">
                    {formatQty(txn.lineItems.reduce((s, l) => s + num(l.quantity), 0))}
                  </td>
                  <td className="border border-line px-2 py-1.5" colSpan={2} />
                  {/* Column footers total the columns above them, not the document. */}
                  <td className="border border-line px-2 py-1.5 text-right">
                    {figures.lineDiscount
                      ? formatCurrency(figures.lineDiscount, { symbol: false })
                      : '—'}
                  </td>
                  <td className="border border-line px-2 py-1.5 text-right">
                    {formatCurrency(figures.lineTax, { symbol: false })}
                  </td>
                  <td className="border border-line px-2 py-1.5 text-right">
                    {formatCurrency(figures.lineAmount, { symbol: false })}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="mt-4 rounded-lg bg-canvas px-4 py-6 text-center">
              <p className="text-[13px] text-ink-soft">
                {meta.label} of{' '}
                <span className="font-semibold text-ink">{formatCurrency(txn.totalAmount)}</span>
                {txn.paymentType ? ` via ${txn.paymentType}` : ''}
              </p>
              {txn.description && (
                <p className="mt-1 text-[12.5px] text-ink-faint">{txn.description}</p>
              )}
            </div>
          )}

          {/* Tax summary + totals */}
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              {taxByRate.size > 0 && (
                <>
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                    Tax Summary
                  </p>
                  <table className="mt-1.5 w-full text-[11.5px]">
                    <thead>
                      <tr className="bg-canvas text-ink-soft">
                        <th className="border border-line px-2 py-1 text-left">Rate</th>
                        <th className="border border-line px-2 py-1 text-right">Taxable</th>
                        {intraState ? (
                          <>
                            <th className="border border-line px-2 py-1 text-right">CGST</th>
                            <th className="border border-line px-2 py-1 text-right">SGST</th>
                          </>
                        ) : (
                          <th className="border border-line px-2 py-1 text-right">IGST</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {[...taxByRate.entries()].map(([rate, v]) => {
                        const split = splitGST(v.tax, intraState);
                        return (
                          <tr key={rate}>
                            <td className="border border-line px-2 py-1">{rate}%</td>
                            <td className="border border-line px-2 py-1 text-right">
                              {formatCurrency(v.taxable, { symbol: false })}
                            </td>
                            {intraState ? (
                              <>
                                <td className="border border-line px-2 py-1 text-right">
                                  {formatCurrency(split.cgst, { symbol: false })}
                                </td>
                                <td className="border border-line px-2 py-1 text-right">
                                  {formatCurrency(split.sgst, { symbol: false })}
                                </td>
                              </>
                            ) : (
                              <td className="border border-line px-2 py-1 text-right">
                                {formatCurrency(split.igst, { symbol: false })}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}

              <div className="mt-4">
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                  Invoice Amount in Words
                </p>
                <p className="mt-1 text-[12.5px] text-ink">{amountInWords(num(txn.totalAmount))}</p>
              </div>

              {txn.description && txn.lineItems.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                    Description
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-soft">{txn.description}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-[12.5px]">
              <Row label="Sub Total" value={formatCurrency(txn.subtotal, { symbol: false })} />
              {/* Sub Total is already net of line discounts; only the invoice-level one goes here. */}
              {figures.invoiceDiscount > 0 && (
                <Row
                  label="Discount"
                  value={`− ${formatCurrency(figures.invoiceDiscount, { symbol: false })}`}
                />
              )}
              <Row label="Total Tax" value={formatCurrency(txn.taxAmount, { symbol: false })} />
              {figures.additionalCharges !== 0 && (
                <Row
                  label="Additional Charges"
                  value={formatCurrency(figures.additionalCharges, { symbol: false })}
                />
              )}
              {num(txn.roundOff) !== 0 && (
                <Row label="Round Off" value={formatCurrency(txn.roundOff, { symbol: false })} />
              )}
              <div className="flex justify-between border-t border-ink pt-1.5 text-[14px] font-bold text-ink">
                <span>Total</span>
                <span>{formatCurrency(txn.totalAmount)}</span>
              </div>
              <Row
                label={meta.cashSign > 0 ? 'Received' : 'Paid'}
                value={formatCurrency(
                  num(txn.receivedAmount) + num(txn.settledAmount),
                  { symbol: false },
                )}
              />
              <div className="flex justify-between font-semibold text-ink">
                <span>Balance</span>
                <span>{formatCurrency(txn.balanceAmount)}</span>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="mt-10 flex justify-end">
            <div className="w-56 border-t border-line pt-2 text-center">
              <p className="text-[12px] text-ink-soft">For {firm?.name ?? 'My Company'}</p>
              <p className="mt-6 text-[11.5px] text-ink-faint">Authorised Signatory</p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete transaction"
        message={`Delete ${meta.label} #${txn.txnNo}? Stock and party balances will be reversed.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doDelete}
        loading={deleting}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-soft">
      <span>{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
