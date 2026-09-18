'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  MessageCircle,
  RefreshCw,
  Plus,
  ChevronRight,
  Boxes,
  Wallet,
  Landmark,
  ReceiptText,
  Package,
  TriangleAlert,
  FileBarChart2,
  BookOpen,
  Users,
  ShoppingBag,
} from 'lucide-react';
import clsx from 'clsx';
import { useGetBootstrapQuery, useGetDashboardQuery } from '@/store/api';
import { Card, Select, Spinner, Badge } from '@/components/ui';
import { SalesChart } from '@/components/charts/SalesChart';
import { formatAmountShort, DATE_RANGE_LABELS, type DateRangeKey } from '@/lib/format';

const MOST_USED_REPORTS = [
  { label: 'Sale Report', href: '/reports/all-transactions?type=sale', icon: ShoppingBag },
  { label: 'All Transactions', href: '/reports/all-transactions', icon: FileBarChart2 },
  { label: 'Daybook Report', href: '/reports/day-book', icon: BookOpen },
  { label: 'Party Statement', href: '/reports/party-statement', icon: Users },
];

/** Restrained icon tints — colour carries meaning, never decoration. */
const TINTS = {
  green: 'bg-success-soft text-success',
  red: 'bg-danger-soft text-danger',
  gold: 'bg-gold-soft text-[#a77a06]',
  blue: 'bg-[#e9eef7] text-[#4f6f9f]',
} as const;

export default function HomePage() {
  const [range, setRange] = useState<DateRangeKey>('this_month');
  const { data, isLoading, isFetching, refetch } = useGetDashboardQuery({ range });
  const { data: bootstrap } = useGetBootstrapQuery();
  const firmName = bootstrap?.firm?.name;

  const growth = data?.sale.growth ?? 0;
  const growthChip = !!data?.sale.count && (
    <Badge tone={growth >= 0 ? 'success' : 'danger'}>
      {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
    </Badge>
  );

  return (
    <div className="min-h-full">
      {isLoading ? (
        <Spinner label="Loading your dashboard…" />
      ) : (
        <div className="px-2 pb-8 pt-3 sm:px-4">
          {/* Greeting + headline counts */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[14px] text-ink-soft">Welcome back,</p>
              <h1 className="mt-0.5 text-[34px] font-semibold leading-tight tracking-tight text-ink">
                {firmName && firmName !== 'My Company' ? firmName : 'Your business'}
              </h1>
              <p className="mt-1 text-[13.5px] text-ink-faint">
                Here&apos;s what&apos;s happening with your business today.
              </p>
            </div>
            <div className="flex items-center divide-x divide-ink/10">
              <HeadlineStat icon={<ReceiptText size={17} />} label="Invoices" value={data?.sale.count ?? 0} />
              <HeadlineStat icon={<Package size={17} />} label="Open orders" value={data?.openOrders ?? 0} />
              <HeadlineStat icon={<TriangleAlert size={17} />} label="Low stock" value={data?.lowStockCount ?? 0} />
            </div>
          </div>

          {/* Headline money */}
          <div className="mb-5 grid gap-5 md:grid-cols-3">
            <KpiCard
              href="/reports/all-parties"
              icon={<ArrowDownCircle size={20} />}
              tint="green"
              label="Total Receivable"
              value={formatAmountShort(data?.receivable ?? 0)}
              note={data?.receivable ? undefined : "You don't have any receivables as of now."}
            />
            <KpiCard
              href="/reports/all-parties"
              icon={<ArrowUpCircle size={20} />}
              tint="red"
              label="Total Payable"
              value={formatAmountShort(data?.payable ?? 0)}
              note={data?.payable ? undefined : "You don't have any payables as of now."}
            />
            <KpiCard
              href="/reports/all-transactions?type=sale"
              icon={<ReceiptText size={20} />}
              tint="gold"
              label="Total Sale"
              value={formatAmountShort(data?.sale.total ?? 0)}
              chip={growthChip}
              chipNote={data?.sale.count ? 'vs previous period' : undefined}
            />
          </div>

          <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* Sales overview */}
            <Card padded={false} className="px-6 pb-4 pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-ink">Sales Overview</p>
                  <p className="mt-2 text-[34px] font-semibold leading-none tracking-tight text-ink">
                    {formatAmountShort(data?.sale.total ?? 0)}
                  </p>
                  {!!data?.sale.count && (
                    <p className="mt-2.5 flex items-center gap-2.5 text-[13px] text-ink-soft">
                      <span>{data.sale.count} invoices</span>
                      {growthChip}
                      <span className="text-ink-faint">vs previous period</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refetch()}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-ink-soft ring-1 ring-white/80 transition hover:bg-white hover:text-ink"
                    aria-label="Refresh"
                  >
                    <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
                  </button>
                  <Select
                    value={range}
                    onChange={(e) => setRange(e.target.value as DateRangeKey)}
                    className="h-9 w-40 rounded-full border-white/80 bg-white/70 text-[13px]"
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

              <div className="-mx-2 mt-3">
                {data && (
                  <SalesChart
                    data={data.salesSeries}
                    from={data.range.from}
                    to={data.range.to}
                    height={300}
                  />
                )}
              </div>
            </Card>

            {/* Right rail */}
            <div className="flex flex-col gap-5">
              <div className="glass-dark rounded-[var(--radius-card)] p-5 text-white">
                <h3 className="flex items-center gap-2.5 text-[15px] font-semibold">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#25d366]/15 text-[#3ddc84]">
                    <MessageCircle size={17} />
                  </span>
                  WhatsApp Connect
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-white/70">
                  Connect WhatsApp to send invoices, share payment reminders and check updates.
                </p>
                <Link
                  href="/parties/whatsapp"
                  className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-white text-[13.5px] font-medium text-ink transition hover:bg-white/90"
                >
                  Connect <ArrowRight size={15} />
                </Link>
              </div>

              {!!data?.openOrders && (
                <Card className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[15px] font-semibold text-ink">Open Orders</h3>
                      <p className="mt-2 text-[30px] font-semibold leading-none tracking-tight text-ink">
                        {data.openOrders}
                      </p>
                    </div>
                    <span className={clsx('flex h-12 w-12 items-center justify-center rounded-2xl', TINTS.gold)}>
                      <Package size={22} />
                    </span>
                  </div>
                  <Link
                    href="/sale/orders"
                    className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-soft transition hover:text-ink"
                  >
                    Review orders <ArrowRight size={14} />
                  </Link>
                </Card>
              )}

              <Card className="flex min-h-28 flex-1 items-center justify-center border-dashed border-ink/10 bg-white/35 shadow-none">
                <button className="flex items-center gap-2 text-[13.5px] text-ink-faint transition hover:text-ink">
                  Add Widget of Your Choice
                  <Plus size={16} />
                </button>
              </Card>
            </div>
          </div>

          {/* Money & stock */}
          <div className="mb-5 grid gap-5 md:grid-cols-3">
            <KpiCard
              href="/cash-bank/cash-in-hand"
              icon={<Wallet size={20} />}
              tint="green"
              label="Cash In Hand"
              value={formatAmountShort(data?.cashInHand ?? 0)}
            />
            <KpiCard
              href="/cash-bank/bank-accounts"
              icon={<Landmark size={20} />}
              tint="blue"
              label="Bank Balance"
              value={formatAmountShort(data?.bankBalance ?? 0)}
            />
            <KpiCard
              href="/reports/stock-summary"
              icon={<Boxes size={20} />}
              tint="gold"
              label="Stock Value"
              value={formatAmountShort(data?.stockValue ?? 0)}
              warning={
                data?.lowStockCount
                  ? `${data.lowStockCount} item${data.lowStockCount > 1 ? 's' : ''} low on stock`
                  : undefined
              }
            />
          </div>

          {/* Most used reports */}
          <Card padded={false} className="px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Most Used Reports</h2>
                <p className="mt-0.5 text-[12.5px] text-ink-faint">
                  Quick access to your frequently used reports
                </p>
              </div>
              <Link
                href="/reports"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/75 px-4 text-[13px] font-medium text-ink ring-1 ring-white/80 transition hover:bg-white"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {MOST_USED_REPORTS.map((r) => (
                <Link
                  key={r.label}
                  href={r.href}
                  className="group flex items-center gap-3 rounded-2xl bg-white/60 px-4 py-3.5 text-[13.5px] font-medium text-ink ring-1 ring-white/80 transition hover:bg-white/90"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-soft text-[#a77a06]">
                    <r.icon size={16} />
                  </span>
                  <span className="flex-1">{r.label}</span>
                  <ChevronRight size={16} className="text-ink-faint transition group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/** One of the counts beside the greeting. */
function HeadlineStat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 px-5 first:pl-0 last:pr-0">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-ink-soft shadow-[inset_0_1px_0_rgb(255_255_255/0.9)] ring-1 ring-white/80">
        {icon}
      </span>
      <div>
        <p className="text-[26px] font-semibold leading-none tracking-tight text-ink">{value}</p>
        <p className="mt-1 text-[12px] text-ink-soft">{label}</p>
      </div>
    </div>
  );
}

/** A money tile: tinted icon, muted label, one large number. */
function KpiCard({
  href,
  icon,
  tint,
  label,
  value,
  note,
  warning,
  chip,
  chipNote,
}: {
  href: string;
  icon: ReactNode;
  tint: keyof typeof TINTS;
  label: string;
  value: string;
  note?: string;
  warning?: string;
  chip?: ReactNode;
  chipNote?: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="flex h-full items-center gap-4 p-5 transition hover:bg-white/75">
        <span className={clsx('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', TINTS[tint])}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-ink-soft">{label}</p>
          <p className="mt-1 truncate text-[26px] font-semibold leading-tight tracking-tight text-ink">
            {value}
          </p>
          {note && <p className="mt-1 text-[12px] text-ink-faint">{note}</p>}
          {warning && <p className="mt-1 text-[12px] text-warning">{warning}</p>}
        </div>
        {chip && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {chip}
            {chipNote && <span className="text-[11.5px] text-ink-faint">{chipNote}</span>}
          </div>
        )}
      </Card>
    </Link>
  );
}
