'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  MessageCircle,
  RefreshCw,
  AlertTriangle,
  Plus,
  ChevronRight,
  Boxes,
  Wallet,
  Landmark,
} from 'lucide-react';
import { useGetDashboardQuery } from '@/store/api';
import { Button, Card, Select, Spinner, Badge } from '@/components/ui';
import { SalesChart } from '@/components/charts/SalesChart';
import { formatAmountShort, DATE_RANGE_LABELS, type DateRangeKey } from '@/lib/format';

const MOST_USED_REPORTS = [
  { label: 'Sale Report', href: '/reports/all-transactions?type=sale' },
  { label: 'All Transactions', href: '/reports/all-transactions' },
  { label: 'Daybook Report', href: '/reports/day-book' },
  { label: 'Party Statement', href: '/reports/party-statement' },
];

export default function HomePage() {
  const [range, setRange] = useState<DateRangeKey>('this_month');
  const { data, isLoading, isFetching, refetch } = useGetDashboardQuery({ range });

  return (
    <div className="min-h-full">
      {/* Plan banner, exactly where Vyapar puts it */}
      <div className="flex flex-wrap items-center gap-3 border-b border-danger/20 bg-danger-soft px-5 py-3">
        <AlertTriangle size={18} className="text-danger" />
        <p className="flex-1 text-[13.5px] text-ink">
          <span className="font-semibold">Your Free Plan has expired.</span> To continue using
          Vyapar, upgrade to our Premium Plan.
        </p>
        <Link href="/plans">
          <Button size="sm">Buy Now</Button>
        </Link>
        <Link href="/plans">
          <Button size="sm" variant="outline" className="border-brand text-brand hover:bg-brand-soft">
            Get Free Demo
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <Spinner label="Loading your dashboard…" />
      ) : (
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
            {/* Receivable / payable */}
            <div className="grid gap-4 sm:grid-cols-2">
              <BalanceTile
                title="Total Receivable"
                amount={data?.receivable ?? 0}
                tone="in"
                emptyText="You don't have any receivables as of now."
                href="/reports/all-parties"
              />
              <BalanceTile
                title="Total Payable"
                amount={data?.payable ?? 0}
                tone="out"
                emptyText="You don't have any payables as of now."
                href="/reports/all-parties"
              />
            </div>

            {/* Sales chart */}
            <Card padded={false}>
              <div className="flex items-start justify-between px-5 pt-4">
                <div>
                  <p className="text-[13.5px] text-ink-soft">Total Sale</p>
                  <p className="mt-1 text-2xl font-semibold text-ink">
                    {formatAmountShort(data?.sale.total ?? 0)}
                  </p>
                  {!!data?.sale.count && (
                    <p className="mt-1 flex items-center gap-2 text-[12.5px] text-ink-soft">
                      <span>{data.sale.count} invoices</span>
                      <Badge tone={data.sale.growth >= 0 ? 'success' : 'danger'}>
                        {data.sale.growth >= 0 ? '↑' : '↓'} {Math.abs(data.sale.growth)}%
                      </Badge>
                      <span>vs previous period</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refetch()}
                    className="rounded-full p-1.5 text-ink-faint transition hover:bg-canvas hover:text-ink"
                    aria-label="Refresh"
                  >
                    <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
                  </button>
                  <Select
                    value={range}
                    onChange={(e) => setRange(e.target.value as DateRangeKey)}
                    className="h-8.5 w-40 rounded-full bg-canvas text-[13px]"
                  >
                    {Object.entries(DATE_RANGE_LABELS)
                      .filter(([k]) => k !== 'custom')
                      .map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                  </Select>
                </div>
              </div>

              <div className="px-2 pb-3">
                {data && (
                  <SalesChart
                    data={data.salesSeries}
                    from={data.range.from}
                    to={data.range.to}
                  />
                )}
              </div>
            </Card>

            {/* Money & stock strip */}
            <div className="grid gap-4 sm:grid-cols-3">
              <MiniTile
                icon={<Wallet size={16} />}
                label="Cash In Hand"
                value={formatAmountShort(data?.cashInHand ?? 0)}
                href="/cash-bank/cash-in-hand"
              />
              <MiniTile
                icon={<Landmark size={16} />}
                label="Bank Balance"
                value={formatAmountShort(data?.bankBalance ?? 0)}
                href="/cash-bank/bank-accounts"
              />
              <MiniTile
                icon={<Boxes size={16} />}
                label="Stock Value"
                value={formatAmountShort(data?.stockValue ?? 0)}
                href="/reports/stock-summary"
                note={
                  data?.lowStockCount
                    ? `${data.lowStockCount} item${data.lowStockCount > 1 ? 's' : ''} low on stock`
                    : undefined
                }
              />
            </div>

            {/* Most used reports */}
            <Card padded={false}>
              <div className="flex items-center justify-between px-5 py-3.5">
                <h2 className="text-[14.5px] font-semibold text-ink">Most Used Reports</h2>
                <Link href="/reports" className="text-[13px] font-medium text-accent">
                  View All
                </Link>
              </div>
              <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
                {MOST_USED_REPORTS.map((r) => (
                  <Link
                    key={r.label}
                    href={r.href}
                    className="flex items-center justify-between rounded-lg border border-line px-4 py-3.5 text-[13.5px] font-medium text-ink transition hover:border-accent hover:bg-accent-soft/40"
                  >
                    {r.label}
                    <ChevronRight size={16} className="text-accent" />
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          {/* Right rail */}
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-start justify-between">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <MessageCircle size={17} className="text-success" />
                  WhatsApp Connect
                </h3>
                <RefreshCw size={14} className="text-ink-faint" />
              </div>
              <p className="mt-2.5 flex items-start gap-2 text-[12.5px] leading-snug text-ink-soft">
                <AlertTriangle size={15} className="mt-px shrink-0 text-warning" />
                Connect WhatsApp to send invoices, share payment reminders and check updates.
              </p>
              <Link href="/parties/whatsapp">
                <Button variant="secondary" size="sm" className="mt-3 w-full">
                  Connect
                </Button>
              </Link>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <h3 className="text-[14px] font-semibold text-ink">Google Profile Manager</h3>
                <Badge tone="danger">TRIAL EXPIRED</Badge>
              </div>
              <p className="mt-2.5 text-[12.5px] leading-snug text-ink-soft">
                76% of local searches result in a visit within 24 hours.
              </p>
              <Link
                href="/plans"
                className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent"
              >
                Buy Now <ChevronRight size={14} />
              </Link>
            </Card>

            {!!data?.openOrders && (
              <Card>
                <h3 className="text-[14px] font-semibold text-ink">Open Orders</h3>
                <p className="mt-1 text-2xl font-semibold text-ink">{data.openOrders}</p>
                <Link
                  href="/sale/orders"
                  className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-accent"
                >
                  Review orders <ChevronRight size={14} />
                </Link>
              </Card>
            )}

            <Card className="flex min-h-32 items-center justify-center border-dashed">
              <button className="flex items-center gap-2 text-[13.5px] text-ink-faint transition hover:text-ink">
                Add Widget of Your Choice
                <Plus size={16} />
              </button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function BalanceTile({
  title,
  amount,
  tone,
  emptyText,
  href,
}: {
  title: string;
  amount: number;
  tone: 'in' | 'out';
  emptyText: string;
  href: string;
}) {
  const Icon = tone === 'in' ? ArrowDown : ArrowUp;
  return (
    <Link href={href}>
      <Card className="h-full transition hover:border-accent/50">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13.5px] text-ink-soft">{title}</p>
            <p className="mt-1.5 text-2xl font-semibold text-ink">{formatAmountShort(amount)}</p>
          </div>
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              tone === 'in' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
            }`}
          >
            <Icon size={18} />
          </span>
        </div>
        {amount === 0 && <p className="mt-3 text-[12.5px] text-ink-faint">{emptyText}</p>}
      </Card>
    </Link>
  );
}

function MiniTile({
  icon,
  label,
  value,
  href,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
  note?: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition hover:border-accent/50">
        <div className="flex items-center gap-2 text-[13px] text-ink-soft">
          <span className="text-accent">{icon}</span>
          {label}
        </div>
        <p className="mt-1.5 text-xl font-semibold text-ink">{value}</p>
        {note && <p className="mt-1 text-[12px] text-warning">{note}</p>}
      </Card>
    </Link>
  );
}

