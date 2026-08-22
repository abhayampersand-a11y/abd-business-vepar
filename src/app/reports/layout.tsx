'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import clsx from 'clsx';
import { REPORT_GROUPS } from './reports-nav';
import { Spinner } from '@/components/ui';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0">
      <Suspense fallback={<div className="w-56 border-r border-line bg-white" />}>
        <ReportsNav />
      </Suspense>
      <div className="min-w-0 flex-1 overflow-y-auto">
        <Suspense fallback={<Spinner />}>{children}</Suspense>
      </div>
    </div>
  );
}

function ReportsNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const currentType = params.get('type');

  return (
    <nav className="w-56 shrink-0 overflow-y-auto border-r border-line bg-white py-2">
      {REPORT_GROUPS.map((group) => (
        <div key={group.title} className="mb-1">
          <p className="px-4 py-2 text-[11.5px] font-medium text-ink-faint">{group.title}</p>
          {group.links.map((link) => {
            const href = `/reports/${link.slug}${link.query ? `?${link.query}` : ''}`;
            // "Sale" and "Purchase" share a slug, so the query decides which is lit.
            const active =
              pathname === `/reports/${link.slug}` &&
              (link.query ? link.query === `type=${currentType}` : !currentType);

            return (
              <Link
                key={link.label}
                href={href}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-2 text-[13px] transition',
                  active
                    ? 'border-l-2 border-accent bg-accent-soft font-medium text-accent'
                    : 'border-l-2 border-transparent text-ink hover:bg-canvas',
                )}
              >
                <span className="flex-1 truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
