'use client';

import Link from 'next/link';
import { ChevronRight, BarChart3 } from 'lucide-react';
import { REPORT_GROUPS } from './reports-nav';
import { Card } from '@/components/ui';

export default function ReportsHome() {
  return (
    <div className="p-5">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <BarChart3 size={20} className="text-accent" />
          Reports
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          Every report is built live from your transactions — pick one to get started.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {REPORT_GROUPS.map((group) => (
          <Card key={group.title} padded={false}>
            <h2 className="border-b border-line px-4 py-3 text-[14px] font-semibold text-ink">
              {group.title}
            </h2>
            <div className="p-2">
              {group.links.map((link) => (
                <Link
                  key={link.label}
                  href={`/reports/${link.slug}${link.query ? `?${link.query}` : ''}`}
                  className="flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] text-ink transition hover:bg-canvas"
                >
                  {link.label}
                  <ChevronRight size={15} className="text-ink-faint" />
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
