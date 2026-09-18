'use client';

import { use, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileSpreadsheet, Printer, BarChart3 } from 'lucide-react';
import { useGetReportQuery, useGetPartiesQuery } from '@/store/api';
import { Spinner, Card, Select, EmptyState } from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { DateRangeFilter, useDateRange } from '@/components/ui/DateRangeFilter';
import { formatCurrency, formatDate, formatQty, num } from '@/lib/format';
import { exportRowsToCSV } from '@/lib/export';
import { reportLabel } from '../reports-nav';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';

type Row = Record<string, unknown>;

export default function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <Suspense fallback={<Spinner />}>
      <ReportScreen slug={slug} />
    </Suspense>
  );
}

function ReportScreen({ slug }: { slug: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get('type') ?? undefined;
  const partyIdParam = searchParams.get('partyId');

  const scope = `report:${slug}:${typeFilter ?? 'all'}`;
  const { from, to } = useDateRange(scope, slug === 'profit-and-loss' ? 'this_year' : 'this_month');

  const needsParty = slug === 'party-statement';
  const { data: parties = [] } = useGetPartiesQuery(undefined, { skip: !needsParty });
  const partyId = partyIdParam ? Number(partyIdParam) : (parties[0]?.id ?? undefined);

  const { data, isLoading, isError, error } = useGetReportQuery(
    { slug, from, to, type: typeFilter, partyId },
    { skip: needsParty && !partyId },
  );

  const title = useMemo(() => {
    if (slug === 'all-transactions' && typeFilter === 'sale') return 'Sale Report';
    if (slug === 'all-transactions' && typeFilter === 'purchase') return 'Purchase Report';
    return reportLabel(slug);
  }, [slug, typeFilter]);

  const rows = (data?.rows as Row[] | undefined) ?? [];

  const download = (columns: Array<Column<Row>>) => {
    if (!rows.length) {
      dispatch(pushToast('Nothing to export for this period', 'info'));
      return;
    }
    exportRowsToCSV(
      `${slug}-${from}-to-${to}.csv`,
      rows.map((r) =>
        Object.fromEntries(
          columns
            .filter((c) => c.key !== 'actions')
            .map((c) => {
              const v = c.value ? c.value(r) : (r[c.key] as string | number);
              return [String(c.header), v ?? ''];
            }),
        ),
      ),
    );
    dispatch(pushToast('Report exported', 'success'));
  };

  const columns = buildColumns(slug, typeFilter);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/60 bg-white/45 backdrop-blur-sm px-5 py-3">
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        <div className="no-print flex items-center gap-2">
          {needsParty && (
            <Select
              value={partyId ?? ''}
              onChange={(e) => router.push(`/reports/party-statement?partyId=${e.target.value}`)}
              className="h-9 w-56"
            >
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          )}
          <button
            onClick={() => download(columns)}
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
      </div>

      {slug !== 'all-parties' && slug !== 'low-stock' && slug !== 'stock-summary' && (
        <DateRangeFilter scope={scope} fallback={slug === 'profit-and-loss' ? 'this_year' : 'this_month'} />
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <Card>
            <p className="text-[13.5px] text-danger">
              {(error as { data?: { error?: string } })?.data?.error ??
                'This report could not be generated.'}
            </p>
          </Card>
        ) : slug === 'profit-and-loss' ? (
          <ProfitAndLoss data={data as never} />
        ) : slug === 'balance-sheet' ? (
          <BalanceSheet data={data as never} />
        ) : (
          <>
            {slug === 'sale-aging' && data?.buckets ? (
              <AgingBuckets buckets={data.buckets as Record<string, number>} />
            ) : null}

            {slug === 'party-statement' && data ? (
              <StatementHeader data={data as never} />
            ) : null}

            <div className="card overflow-hidden">
              {rows.length ? (
                <DataTable
                  columns={columns}
                  rows={rows}
                  rowKey={(r, ) => String(r.id ?? r.txnId ?? r.itemId ?? r.partyId ?? JSON.stringify(r).slice(0, 40))}
                  onRowClick={(r) => {
                    const id = r.txnId ?? (r.id as number | undefined);
                    if (id && slug !== 'all-parties' && slug !== 'stock-summary' && slug !== 'low-stock') {
                      router.push(`/txn/${id}`);
                    }
                  }}
                  dense
                  footer={<ReportFooter slug={slug} data={data as never} rows={rows} />}
                />
              ) : (
                <EmptyState
                  icon={<BarChart3 size={28} />}
                  title="No data for this period"
                  description="Try widening the date range, or record some transactions first."
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Column definitions per report
 * ------------------------------------------------------------------ */

const money = (key: string, header: string): Column<Row> => ({
  key,
  header,
  align: 'right',
  value: (r) => num(r[key]),
  render: (r) => formatCurrency(r[key] as string),
});

const dateCol = (key: string, header = 'Date'): Column<Row> => ({
  key,
  header,
  filterable: true,
  value: (r) => String(r[key] ?? ''),
  render: (r) => formatDate(r[key] as string),
});

function buildColumns(slug: string, typeFilter?: string): Array<Column<Row>> {
  switch (slug) {
    case 'day-book':
      return [
        dateCol('txnDate'),
        { key: 'label', header: 'Type', filterable: true },
        { key: 'txnNo', header: 'Ref No.' },
        { key: 'partyName', header: 'Name', filterable: true, value: (r) => String(r.partyName ?? '—') },
        money('totalAmount', 'Total'),
        money('moneyIn', 'Money In'),
        money('moneyOut', 'Money Out'),
      ];

    case 'all-transactions':
      return [
        dateCol('txnDate'),
        { key: 'txnNo', header: 'No.' },
        { key: 'partyName', header: 'Party Name', filterable: true, value: (r) => String(r.partyName ?? '—') },
        ...(typeFilter
          ? []
          : [{ key: 'label', header: 'Transaction', filterable: true } as Column<Row>]),
        { key: 'paymentType', header: 'Payment Type', filterable: true },
        money('totalAmount', 'Amount'),
        money('balanceAmount', 'Balance'),
        {
          key: 'status',
          header: 'Status',
          filterable: true,
          render: (r) => <StatusPill status={String(r.status)} dueDate={r.dueDate as string} />,
        },
      ];

    case 'bill-wise-profit':
      return [
        dateCol('txnDate'),
        { key: 'txnNo', header: 'Invoice No.' },
        { key: 'partyName', header: 'Party', filterable: true, value: (r) => String(r.partyName ?? '—') },
        money('revenue', 'Revenue'),
        money('cost', 'Cost'),
        {
          key: 'profit',
          header: 'Profit',
          align: 'right',
          value: (r) => num(r.profit),
          render: (r) => (
            <span className={num(r.profit) >= 0 ? 'font-medium text-success' : 'font-medium text-danger'}>
              {formatCurrency(r.profit as number)}
            </span>
          ),
        },
      ];

    case 'sale-aging':
      return [
        dateCol('txnDate'),
        { key: 'txnNo', header: 'Invoice No.' },
        { key: 'partyName', header: 'Party', filterable: true, value: (r) => String(r.partyName ?? '—') },
        dateCol('dueDate', 'Due Date'),
        { key: 'daysOverdue', header: 'Days Overdue', align: 'right' },
        money('balance', 'Balance Due'),
      ];

    case 'cash-flow':
      return [
        dateCol('date'),
        { key: 'label', header: 'Type', filterable: true },
        { key: 'txnNo', header: 'Ref No.' },
        { key: 'partyName', header: 'Name', value: (r) => String(r.partyName ?? '—') },
        money('moneyIn', 'Money In'),
        money('moneyOut', 'Money Out'),
        money('balance', 'Running Balance'),
      ];

    case 'party-statement':
      return [
        dateCol('txnDate'),
        { key: 'label', header: 'Type', filterable: true },
        { key: 'txnNo', header: 'Ref No.' },
        money('debit', 'Debit'),
        money('credit', 'Credit'),
        money('balance', 'Balance'),
      ];

    case 'all-parties':
      return [
        { key: 'name', header: 'Party Name', filterable: true },
        { key: 'phone', header: 'Phone', value: (r) => String(r.phone ?? '—') },
        { key: 'gstin', header: 'GSTIN', value: (r) => String(r.gstin ?? '—') },
        { key: 'partyGroup', header: 'Group', filterable: true },
        {
          key: 'receivable',
          header: 'Receivable',
          align: 'right',
          value: (r) => (num(r.balance) > 0 ? num(r.balance) : 0),
          render: (r) => (num(r.balance) > 0 ? formatCurrency(r.balance as string) : '—'),
        },
        {
          key: 'payable',
          header: 'Payable',
          align: 'right',
          value: (r) => (num(r.balance) < 0 ? Math.abs(num(r.balance)) : 0),
          render: (r) => (num(r.balance) < 0 ? formatCurrency(Math.abs(num(r.balance))) : '—'),
        },
      ];

    case 'sale-purchase-by-party':
      return [
        { key: 'partyName', header: 'Party Name', filterable: true },
        money('sale', 'Sale'),
        money('purchase', 'Purchase'),
      ];

    case 'stock-summary':
      return [
        { key: 'name', header: 'Item Name', filterable: true },
        { key: 'itemCode', header: 'Item Code', value: (r) => String(r.itemCode ?? '—') },
        { key: 'categoryName', header: 'Category', filterable: true, value: (r) => String(r.categoryName ?? '—') },
        {
          key: 'stockQty',
          header: 'Stock Qty',
          align: 'right',
          value: (r) => num(r.stockQty),
          render: (r) => formatQty(r.stockQty),
        },
        money('purchasePrice', 'Purchase Price'),
        money('salePrice', 'Sale Price'),
        money('stockValue', 'Stock Value'),
      ];

    case 'low-stock':
      return [
        { key: 'name', header: 'Item Name', filterable: true },
        {
          key: 'stockQty',
          header: 'In Stock',
          align: 'right',
          value: (r) => num(r.stockQty),
          render: (r) => (
            <span className="font-medium text-warning">{formatQty(r.stockQty)}</span>
          ),
        },
        {
          key: 'minStockLevel',
          header: 'Min Level',
          align: 'right',
          render: (r) => formatQty(r.minStockLevel),
        },
        {
          key: 'shortBy',
          header: 'Short By',
          align: 'right',
          render: (r) => formatQty(r.shortBy),
        },
      ];

    case 'item-wise-profit':
      return [
        { key: 'name', header: 'Item Name', filterable: true },
        {
          key: 'qtySold',
          header: 'Qty Sold',
          align: 'right',
          value: (r) => num(r.qtySold),
          render: (r) => formatQty(r.qtySold),
        },
        money('revenue', 'Revenue'),
        money('cost', 'Cost'),
        {
          key: 'profit',
          header: 'Profit',
          align: 'right',
          value: (r) => num(r.profit),
          render: (r) => (
            <span className={num(r.profit) >= 0 ? 'font-medium text-success' : 'font-medium text-danger'}>
              {formatCurrency(r.profit as number)}
            </span>
          ),
        },
      ];

    case 'item-detail':
      return [
        dateCol('txnDate'),
        { key: 'itemName', header: 'Item Name', filterable: true },
        { key: 'label', header: 'Type', filterable: true },
        { key: 'txnNo', header: 'Ref No.' },
        { key: 'partyName', header: 'Party', value: (r) => String(r.partyName ?? '—') },
        {
          key: 'quantity',
          header: 'Qty',
          align: 'right',
          value: (r) => num(r.quantity),
          render: (r) => `${formatQty(r.quantity)} ${r.unit ?? ''}`,
        },
        money('pricePerUnit', 'Price/Unit'),
        money('total', 'Amount'),
      ];

    case 'gstr-1':
    case 'gstr-2':
      return [
        { key: 'gstin', header: 'GSTIN/UIN', value: (r) => String(r.gstin ?? '—') },
        { key: 'partyName', header: 'Party Name', filterable: true },
        { key: 'txnNo', header: 'Invoice No.' },
        dateCol('txnDate'),
        { key: 'label', header: 'Type', filterable: true },
        money('value', 'Invoice Value'),
        {
          key: 'rate',
          header: 'Tax Rate',
          align: 'right',
          value: (r) => (r.rates as Array<{ rate: number }>)?.[0]?.rate ?? 0,
          render: (r) =>
            (r.rates as Array<{ rate: number }>)?.map((x) => `${x.rate}%`).join(', ') || '—',
        },
        money('taxAmount', 'Tax Amount'),
      ];

    case 'gst-rate':
      return [
        {
          key: 'taxRate',
          header: 'Tax Rate',
          align: 'right',
          value: (r) => num(r.taxRate),
          render: (r) => `${num(r.taxRate)}%`,
        },
        { key: 'txnType', header: 'Transaction', filterable: true },
        money('taxable', 'Taxable Value'),
        money('tax', 'Tax Amount'),
      ];

    case 'hsn-summary':
      return [
        { key: 'hsnSac', header: 'HSN/SAC', filterable: true },
        {
          key: 'quantity',
          header: 'Qty',
          align: 'right',
          value: (r) => num(r.quantity),
          render: (r) => formatQty(r.quantity),
        },
        money('taxable', 'Taxable Value'),
        money('tax', 'Tax Amount'),
        money('total', 'Total'),
      ];

    case 'expense':
      return [
        dateCol('txnDate'),
        { key: 'txnNo', header: 'Exp No.' },
        { key: 'categoryName', header: 'Category', filterable: true },
        { key: 'partyName', header: 'Party', value: (r) => String(r.partyName ?? '—') },
        { key: 'paymentType', header: 'Payment Type', filterable: true },
        money('totalAmount', 'Amount'),
        money('balanceAmount', 'Balance'),
      ];

    case 'expense-category':
      return [
        { key: 'name', header: 'Category', filterable: true },
        { key: 'type', header: 'Type', filterable: true },
        money('total', 'Total Amount'),
      ];

    case 'orders':
      return [
        dateCol('txnDate'),
        { key: 'txnNo', header: 'Order No.' },
        { key: 'label', header: 'Type', filterable: true },
        { key: 'partyName', header: 'Party', filterable: true, value: (r) => String(r.partyName ?? '—') },
        dateCol('deliveryDate', 'Delivery Date'),
        money('totalAmount', 'Amount'),
        {
          key: 'status',
          header: 'Status',
          filterable: true,
          render: (r) => <StatusPill status={String(r.status)} />,
        },
      ];

    case 'discount':
      return [
        dateCol('txnDate'),
        { key: 'txnNo', header: 'No.' },
        { key: 'label', header: 'Transaction', filterable: true },
        { key: 'partyName', header: 'Party', filterable: true, value: (r) => String(r.partyName ?? '—') },
        money('totalAmount', 'Amount'),
        money('discountAmount', 'Discount'),
      ];

    default:
      return [
        dateCol('txnDate'),
        { key: 'txnNo', header: 'No.' },
        { key: 'partyName', header: 'Party', value: (r) => String(r.partyName ?? '—') },
        money('totalAmount', 'Amount'),
      ];
  }
}

/* ------------------------------------------------------------------ *
 * Report-specific chrome
 * ------------------------------------------------------------------ */

function ReportFooter({
  slug,
  data,
  rows,
}: {
  slug: string;
  data?: { summary?: Record<string, number> };
  rows: Row[];
}) {
  const summary = data?.summary;

  if (summary) {
    return (
      <div className="flex flex-wrap justify-end gap-6 text-[13px] font-medium text-ink">
        {Object.entries(summary).map(([k, v]) => (
          <span key={k}>
            {humanise(k)}: {formatCurrency(v)}
          </span>
        ))}
      </div>
    );
  }

  // Sensible per-report totals when the API doesn't send a summary block.
  const totalKey =
    slug === 'item-wise-profit' || slug === 'bill-wise-profit'
      ? 'profit'
      : slug === 'stock-summary'
        ? 'stockValue'
        : slug === 'expense-category'
          ? 'total'
          : slug === 'sale-aging'
            ? 'balance'
            : null;

  if (!totalKey) return <span className="text-[13px] text-ink-soft">{rows.length} rows</span>;

  const total = rows.reduce((s, r) => s + num(r[totalKey]), 0);
  return (
    <div className="flex justify-between text-[13px] font-medium text-ink">
      <span>{rows.length} rows</span>
      <span>
        {humanise(totalKey)}: {formatCurrency(total)}
      </span>
    </div>
  );
}

function humanise(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function AgingBuckets({ buckets }: { buckets: Record<string, number> }) {
  const LABELS: Record<string, string> = {
    current: 'Not yet due',
    d1_30: '1–30 days',
    d31_45: '31–45 days',
    d46_60: '46–60 days',
    d60plus: '60+ days',
  };
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-5">
      {Object.entries(LABELS).map(([key, label]) => (
        <Card key={key}>
          <p className="text-[12px] text-ink-faint">{label}</p>
          <p className="mt-1 text-[16px] font-semibold text-ink">
            {formatCurrency(buckets[key] ?? 0)}
          </p>
        </Card>
      ))}
    </div>
  );
}

function StatementHeader({
  data,
}: {
  data: { party?: { name: string; phone?: string }; opening: number; closing: number };
}) {
  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold text-ink">{data.party?.name}</p>
          {data.party?.phone && <p className="text-[12.5px] text-ink-faint">{data.party.phone}</p>}
        </div>
        <div className="flex gap-8 text-right">
          <div>
            <p className="text-[12px] text-ink-faint">Opening Balance</p>
            <p className="text-[15px] font-semibold text-ink">{formatCurrency(data.opening)}</p>
          </div>
          <div>
            <p className="text-[12px] text-ink-faint">Closing Balance</p>
            <p
              className={`text-[15px] font-semibold ${
                data.closing < 0 ? 'text-danger' : 'text-success'
              }`}
            >
              {formatCurrency(Math.abs(data.closing))} {data.closing < 0 ? 'Dr' : 'Cr'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProfitAndLoss({
  data,
}: {
  data: {
    sale: number;
    saleReturn: number;
    netSale: number;
    purchase: number;
    purchaseReturn: number;
    netPurchase: number;
    openingStock: number;
    closingStock: number;
    expense: number;
    expenseByCategory: Array<{ name: string; type: string; total: number }>;
    taxPayable: number;
    grossProfit: number;
    netProfit: number;
  };
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card padded={false}>
        <h2 className="border-b border-line px-4 py-3 text-[14px] font-semibold text-ink">
          Trading Account
        </h2>
        <div className="divide-y divide-line">
          <PLRow label="Sale" value={data.sale} />
          <PLRow label="Less: Sale Return / Credit Note" value={-data.saleReturn} />
          <PLRow label="Net Sale" value={data.netSale} bold />
          <PLRow label="Opening Stock" value={data.openingStock} />
          <PLRow label="Purchase" value={data.purchase} />
          <PLRow label="Less: Purchase Return / Debit Note" value={-data.purchaseReturn} />
          <PLRow label="Net Purchase" value={data.netPurchase} bold />
          <PLRow label="Closing Stock" value={data.closingStock} />
          <PLRow label="Gross Profit" value={data.grossProfit} bold tone />
        </div>
      </Card>

      <Card padded={false}>
        <h2 className="border-b border-line px-4 py-3 text-[14px] font-semibold text-ink">
          Expenses & Net Profit
        </h2>
        <div className="divide-y divide-line">
          {data.expenseByCategory.length ? (
            data.expenseByCategory.map((e) => (
              <PLRow key={e.name} label={`${e.name} (${e.type})`} value={e.total} />
            ))
          ) : (
            <p className="px-4 py-3 text-[13px] text-ink-faint">No expenses in this period.</p>
          )}
          <PLRow label="Total Expenses" value={data.expense} bold />
          <PLRow label="Tax Payable (Output − Input)" value={data.taxPayable} />
          <PLRow label="Net Profit" value={data.netProfit} bold tone />
        </div>
      </Card>
    </div>
  );
}

function PLRow({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: number;
  bold?: boolean;
  tone?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className={`text-[13px] ${bold ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
        {label}
      </span>
      <span
        className={`text-[13.5px] ${bold ? 'font-semibold' : ''} ${
          tone ? (value >= 0 ? 'text-success' : 'text-danger') : 'text-ink'
        }`}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function BalanceSheet({
  data,
}: {
  data: {
    assets: { receivable: number; closingStock: number };
    liabilities: { payable: number };
  };
}) {
  const totalAssets = data.assets.receivable + data.assets.closingStock;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card padded={false}>
        <h2 className="border-b border-line px-4 py-3 text-[14px] font-semibold text-ink">
          Assets
        </h2>
        <div className="divide-y divide-line">
          <PLRow label="Accounts Receivable" value={data.assets.receivable} />
          <PLRow label="Closing Stock" value={data.assets.closingStock} />
          <PLRow label="Total Assets" value={totalAssets} bold />
        </div>
      </Card>
      <Card padded={false}>
        <h2 className="border-b border-line px-4 py-3 text-[14px] font-semibold text-ink">
          Liabilities
        </h2>
        <div className="divide-y divide-line">
          <PLRow label="Accounts Payable" value={data.liabilities.payable} />
          <PLRow label="Total Liabilities" value={data.liabilities.payable} bold />
          <PLRow label="Net Worth" value={totalAssets - data.liabilities.payable} bold tone />
        </div>
      </Card>
    </div>
  );
}
