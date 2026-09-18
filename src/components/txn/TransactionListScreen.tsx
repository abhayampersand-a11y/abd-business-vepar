'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Printer,
  Share2,
  MoreVertical,
  Settings,
  FileSpreadsheet,
  BarChart3,
  Search,
  FileText,
  Trash2,
  Pencil,
  Copy,
} from 'lucide-react';
import { useGetTransactionsQuery, useDeleteTransactionMutation } from '@/store/api';
import {
  Button,
  Spinner,
  EmptyState,
  Menu,
  Select,
  ConfirmDialog,
  SearchInput,
} from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { DateRangeFilter, useDateRange } from '@/components/ui/DateRangeFilter';
import { TXN_META } from '@/lib/constants';
import { formatAmountShort, formatCurrency, formatDate, num } from '@/lib/format';
import { exportRowsToCSV } from '@/lib/export';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';
import type { TxnType, TransactionRow } from '@/types';

type Props = {
  /** One or more document types this screen lists. */
  types: TxnType[];
  title: string;
  addLabel?: string;
  /** Shows the payment-status dropdown, as the credit-note screen does. */
  showStatusFilter?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Payment' },
  { value: 'unpaid', label: 'Unpaid/ Unused' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid/ Used' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function TransactionListScreen({
  types,
  title,
  addLabel,
  showStatusFilter,
  emptyTitle,
  emptyDescription,
}: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const scope = types.join(',');
  const { from, to } = useDateRange(scope);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TransactionRow | null>(null);

  const primary = TXN_META[types[0]];
  const { data, isLoading, isFetching } = useGetTransactionsQuery({
    types: scope,
    from,
    to,
    status: status === 'all' ? undefined : status,
    search: search || undefined,
  });
  const [deleteTxn, { isLoading: deleting }] = useDeleteTransactionMutation();

  const rows = data?.transactions ?? [];
  const summary = data?.summary;

  const isOpenDoc = primary.partySign === 0 && primary.cashSign === 0;
  const isPayment = types[0] === 'payment_in' || types[0] === 'payment_out';

  const columns = useMemo<Array<Column<TransactionRow>>>(() => {
    const base: Array<Column<TransactionRow>> = [
      {
        key: 'txnDate',
        header: 'Date',
        filterable: true,
        value: (t) => t.txnDate,
        render: (t) => formatDate(t.txnDate),
      },
      {
        key: 'txnNo',
        header: isPayment ? 'Receipt no' : 'Invoice no',
        filterable: true,
        value: (t) => t.txnNo,
      },
      {
        key: 'partyName',
        header: 'Party Name',
        filterable: true,
        value: (t) => t.partyName ?? '',
        render: (t) => <span className="font-medium text-ink">{t.partyName ?? '—'}</span>,
      },
    ];

    if (types.length > 1) {
      base.push({
        key: 'txnType',
        header: 'Transaction',
        filterable: true,
        value: (t) => TXN_META[t.txnType].label,
        render: (t) => TXN_META[t.txnType].label,
      });
    } else {
      base.push({
        key: 'txnType',
        header: 'Transaction',
        sortable: false,
        render: () => primary.label,
      });
    }

    base.push(
      { key: 'paymentType', header: 'Payment Type', filterable: true },
      {
        key: 'totalAmount',
        header: 'Amount',
        align: 'right',
        value: (t) => num(t.totalAmount),
        render: (t) => formatCurrency(t.totalAmount),
      },
    );

    if (!isOpenDoc && !isPayment) {
      base.push({
        key: 'balanceAmount',
        header: 'Balance',
        align: 'right',
        value: (t) => num(t.balanceAmount),
        render: (t) => formatCurrency(t.balanceAmount),
      });
    }

    if (!isPayment) {
      base.push({
        key: 'dueDate',
        header: 'Due date',
        filterable: true,
        value: (t) => t.dueDate ?? '',
        render: (t) => formatDate(t.dueDate),
      });
    }

    base.push({
      key: 'status',
      header: 'Status',
      filterable: true,
      render: (t) => <StatusPill status={t.status} dueDate={t.dueDate} />,
    });

    base.push({
      key: 'actions',
      header: 'Actions',
      sortable: false,
      width: '120px',
      render: (t) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/txn/${t.id}?print=1`}
            className="rounded p-1.5 text-ink-faint transition hover:bg-canvas hover:text-ink"
            aria-label="Print"
          >
            <Printer size={15} />
          </Link>
          <Link
            href={`/txn/${t.id}`}
            className="rounded p-1.5 text-ink-faint transition hover:bg-canvas hover:text-ink"
            aria-label="Share"
          >
            <Share2 size={15} />
          </Link>
          <Menu
            trigger={
              <span className="rounded p-1.5 text-ink-faint transition hover:bg-canvas hover:text-ink">
                <MoreVertical size={15} />
              </span>
            }
            items={[
              {
                label: 'View',
                icon: <FileText size={14} />,
                onClick: () => router.push(`/txn/${t.id}`),
              },
              {
                label: 'Edit',
                icon: <Pencil size={14} />,
                onClick: () => router.push(`/txn/${t.id}/edit`),
              },
              {
                label: 'Duplicate',
                icon: <Copy size={14} />,
                onClick: () => router.push(`/txn/new/${t.txnType}?duplicate=${t.id}`),
              },
              ...(t.txnType === 'estimate' ||
              t.txnType === 'proforma' ||
              t.txnType === 'sale_order' ||
              t.txnType === 'delivery_challan'
                ? [
                    {
                      label: 'Convert to Sale Invoice',
                      onClick: () => router.push(`/txn/new/sale?convert=${t.id}`),
                    },
                  ]
                : []),
              ...(t.txnType === 'purchase_order'
                ? [
                    {
                      label: 'Convert to Purchase Bill',
                      onClick: () => router.push(`/txn/new/purchase?convert=${t.id}`),
                    },
                  ]
                : []),
              {
                label: 'Delete',
                danger: true,
                icon: <Trash2 size={14} />,
                onClick: () => setConfirmDelete(t),
              },
            ]}
          />
        </div>
      ),
    });

    return base;
  }, [types, primary, isOpenDoc, isPayment, router]);

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteTxn(confirmDelete.id).unwrap();
      dispatch(pushToast(`${TXN_META[confirmDelete.txnType].label} deleted`, 'success'));
      setConfirmDelete(null);
    } catch (err) {
      dispatch(
        pushToast(
          (err as { data?: { error?: string } })?.data?.error ?? 'Could not delete',
          'error',
        ),
      );
    }
  };

  const exportCSV = () => {
    exportRowsToCSV(
      `${title.replace(/\s+/g, '-').toLowerCase()}-${from}-to-${to}.csv`,
      rows.map((t) => ({
        Date: formatDate(t.txnDate),
        Number: t.txnNo,
        Party: t.partyName ?? '',
        Transaction: TXN_META[t.txnType].label,
        'Payment Type': t.paymentType,
        Amount: num(t.totalAmount),
        Balance: num(t.balanceAmount),
        'Due Date': formatDate(t.dueDate),
        Status: t.status,
      })),
    );
    dispatch(pushToast('Exported to CSV', 'success'));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/60 bg-white/45 backdrop-blur-sm px-5 py-3">
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        <div className="flex items-center gap-2">
          <Link href={`/txn/new/${types[0]}`}>
            <Button icon={<Plus size={16} />}>{addLabel ?? `Add ${primary.label}`}</Button>
          </Link>
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="rounded-full p-2 text-ink-soft transition hover:bg-canvas"
            aria-label="Search"
          >
            <Search size={17} />
          </button>
          <Link href="/settings" className="rounded-full p-2 text-ink-soft transition hover:bg-canvas">
            <Settings size={17} />
          </Link>
        </div>
      </div>

      {/* Filters */}
      <DateRangeFilter
        scope={scope}
        extra={
          <>
            {showStatusFilter && (
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-8.5 w-44 rounded-full bg-accent-soft text-[13px]"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-success transition hover:bg-success-soft"
              >
                <FileSpreadsheet size={15} />
                Excel Report
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition hover:bg-canvas"
              >
                <Printer size={15} />
                Print
              </button>
            </div>
          </>
        }
      />

      {showSearch && (
        <div className="border-b border-white/60 bg-white/45 backdrop-blur-sm px-5 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by party, number or reference"
            className="max-w-sm"
          />
        </div>
      )}

      {/* Summary strip */}
      {!isOpenDoc && (
        <div className="border-b border-white/60 bg-white/45 backdrop-blur-sm px-5 py-3.5">
          <div className="card inline-flex min-w-72 flex-col p-4">
            <p className="text-[13px] text-ink-soft">
              {isPayment ? 'Total Amount' : `Total ${primary.label} Amount`}
            </p>
            <p className="mt-1 text-xl font-semibold text-ink">
              {formatAmountShort(summary?.total ?? 0)}
            </p>
            <div className="mt-2 flex gap-4 text-[12.5px] text-ink-soft">
              <span>
                Received: <span className="text-ink">{formatAmountShort(summary?.received ?? 0)}</span>
              </span>
              {!isPayment && (
                <span>
                  Balance:{' '}
                  <span className="text-ink">{formatAmountShort(summary?.balance ?? 0)}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[14.5px] font-semibold text-ink">Transactions</h2>
            {isFetching && <span className="text-[12px] text-ink-faint">Refreshing…</span>}
          </div>

          {isLoading ? (
            <Spinner />
          ) : rows.length ? (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(t) => t.id}
              onRowClick={(t) => router.push(`/txn/${t.id}`)}
              dense
              footer={
                <div className="flex justify-between text-[13px] font-medium text-ink">
                  <span>Total: {formatCurrency(summary?.total ?? 0)}</span>
                  {!isOpenDoc && !isPayment && (
                    <span>Balance: {formatCurrency(summary?.balance ?? 0)}</span>
                  )}
                </div>
              }
            />
          ) : (
            <EmptyState
              icon={<BarChart3 size={28} />}
              title={emptyTitle ?? 'No Transactions to show'}
              description={emptyDescription ?? "You haven't added any transactions yet."}
              action={
                <Link href={`/txn/new/${types[0]}`}>
                  <Button icon={<Plus size={16} />}>
                    {addLabel ?? `Add ${primary.label}`}
                  </Button>
                </Link>
              }
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete transaction"
        message={`Delete ${
          confirmDelete ? TXN_META[confirmDelete.txnType].label : ''
        } #${confirmDelete?.txnNo}? Stock and balances will be reversed.`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        loading={deleting}
      />
    </div>
  );
}
