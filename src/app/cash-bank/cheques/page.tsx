'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare } from 'lucide-react';
import { useGetTransactionsQuery } from '@/store/api';
import { Spinner, EmptyState, Tabs } from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { DateRangeFilter, useDateRange } from '@/components/ui/DateRangeFilter';
import { TXN_META } from '@/lib/constants';
import { formatCurrency, formatDate, num } from '@/lib/format';
import type { TransactionRow } from '@/types';

const TABS = [
  { id: 'open', label: 'Open Cheques' },
  { id: 'all', label: 'All Cheques' },
];

/** Every transaction settled by cheque, so deposits can be tracked. */
export default function ChequesPage() {
  const router = useRouter();
  const [tab, setTab] = useState('open');
  const { from, to } = useDateRange('cheques', 'this_year');

  const { data, isLoading } = useGetTransactionsQuery({ from, to });

  const cheques = useMemo(() => {
    const all = (data?.transactions ?? []).filter((t) => t.paymentType === 'Cheque');
    return tab === 'open' ? all.filter((t) => t.status !== 'paid') : all;
  }, [data, tab]);

  const columns: Array<Column<TransactionRow>> = [
    {
      key: 'txnDate',
      header: 'Date',
      filterable: true,
      value: (t) => t.txnDate,
      render: (t) => formatDate(t.txnDate),
    },
    { key: 'chequeNo', header: 'Cheque No.', render: (t) => t.chequeNo ?? '—' },
    { key: 'partyName', header: 'Party Name', filterable: true, value: (t) => t.partyName ?? '' },
    {
      key: 'txnType',
      header: 'Transaction',
      filterable: true,
      value: (t) => TXN_META[t.txnType].label,
      render: (t) => TXN_META[t.txnType].label,
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      align: 'right',
      value: (t) => num(t.totalAmount),
      render: (t) => formatCurrency(t.totalAmount),
    },
    {
      key: 'direction',
      header: 'Type',
      render: (t) => (TXN_META[t.txnType].cashSign > 0 ? 'Receivable' : 'Payable'),
    },
    { key: 'status', header: 'Status', filterable: true, render: (t) => <StatusPill status={t.status} /> },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line bg-white px-5 py-3">
        <h1 className="text-lg font-semibold text-ink">Cheques</h1>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <DateRangeFilter scope="cheques" fallback="this_year" />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="card overflow-hidden">
          {isLoading ? (
            <Spinner />
          ) : cheques.length ? (
            <DataTable
              columns={columns}
              rows={cheques}
              rowKey={(t) => t.id}
              onRowClick={(t) => router.push(`/txn/${t.id}`)}
              dense
              footer={
                <span className="text-[13px] font-medium text-ink">
                  Total: {formatCurrency(cheques.reduce((s, t) => s + num(t.totalAmount), 0))}
                </span>
              }
            />
          ) : (
            <EmptyState
              icon={<CheckSquare size={28} />}
              title="No cheques to show"
              description="Transactions recorded with the Cheque payment type appear here."
            />
          )}
        </div>
      </div>
    </div>
  );
}
