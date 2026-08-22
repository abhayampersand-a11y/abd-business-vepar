'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, ArrowRight } from 'lucide-react';
import { useGetReportQuery, useGetBootstrapQuery } from '@/store/api';
import { Button, Card, Select, Spinner } from '@/components/ui';
import { formatCurrency, financialYearStart, toISODate } from '@/lib/format';

/**
 * Closing a financial year in Vyapar is really a review step: check the year's
 * numbers, then start the next year's books. Nothing is destroyed.
 */
export default function CloseYearPage() {
  const { data: bootstrap } = useGetBootstrapQuery();
  const currentFY = financialYearStart(new Date()).getFullYear();
  const [year, setYear] = useState(currentFY);

  const from = `${year}-04-01`;
  const to = `${year + 1}-03-31`;

  const { data, isLoading } = useGetReportQuery({ slug: 'profit-and-loss', from, to });
  const pl = data as
    | {
        netSale: number;
        netPurchase: number;
        expense: number;
        closingStock: number;
        grossProfit: number;
        netProfit: number;
        taxPayable: number;
      }
    | undefined;

  const years = [currentFY, currentFY - 1, currentFY - 2, currentFY - 3];

  return (
    <div className="p-5">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <CalendarCheck size={19} className="text-accent" />
        Close Financial Year
      </h1>
      <p className="mt-0.5 text-[13px] text-ink-soft">
        Review the year, then carry the closing stock and balances into the next one.
      </p>

      <Card className="mt-4 max-w-3xl">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-[12.5px] font-medium text-ink-soft">Financial Year</p>
            <Select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1.5 w-48"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  1 Apr {y} — 31 Mar {y + 1}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-[12.5px] text-ink-faint">
            Books began {bootstrap?.firm?.booksBeginDate ?? toISODate()}
          </p>
        </div>

        {isLoading ? (
          <Spinner />
        ) : pl ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Metric label="Net Sale" value={pl.netSale} />
            <Metric label="Net Purchase" value={pl.netPurchase} />
            <Metric label="Total Expenses" value={pl.expense} />
            <Metric label="Closing Stock" value={pl.closingStock} />
            <Metric label="Gross Profit" value={pl.grossProfit} tone />
            <Metric label="Net Profit" value={pl.netProfit} tone />
            <Metric label="Tax Payable (Output − Input)" value={pl.taxPayable} />
          </div>
        ) : null}

        <div className="mt-5 rounded-lg bg-accent-soft px-4 py-3 text-[12.5px] leading-relaxed text-ink">
          Closing a year here is a review step — nothing is deleted. Your closing stock is already
          the opening stock of the next year, and party balances carry forward automatically.
          Export the year&apos;s reports for your accountant before you move on.
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/reports/profit-and-loss?from=${from}&to=${to}`}>
            <Button icon={<ArrowRight size={15} />}>Open full P&amp;L</Button>
          </Link>
          <Link href="/utilities/export-items">
            <Button variant="secondary">Export the year&apos;s data</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: boolean }) {
  return (
    <div className="rounded-lg border border-line px-4 py-3">
      <p className="text-[12px] text-ink-faint">{label}</p>
      <p
        className={`mt-0.5 text-[16px] font-semibold ${
          tone ? (value >= 0 ? 'text-success' : 'text-danger') : 'text-ink'
        }`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}
