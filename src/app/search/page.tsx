'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Users, Package, FileText, CornerDownLeft } from 'lucide-react';
import { useGetPartiesQuery, useGetItemsQuery, useGetTransactionsQuery } from '@/store/api';
import { Card, SearchInput, Spinner } from '@/components/ui';
import { TXN_META } from '@/lib/constants';
import { formatCurrency, formatDate, num, resolveDateRange } from '@/lib/format';

/** "Open Anything" — one box across parties, items and documents. */
export default function SearchPage() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const { data: parties = [], isLoading: pLoading } = useGetPartiesQuery();
  const { data: items = [], isLoading: iLoading } = useGetItemsQuery();
  const year = resolveDateRange('this_year');
  const { data: txnData, isLoading: tLoading } = useGetTransactionsQuery({
    from: year.from,
    to: year.to,
    limit: 1000,
  });

  const results = useMemo(() => {
    if (!q) return { parties: [], items: [], transactions: [] };
    return {
      parties: parties
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.phone?.toLowerCase().includes(q) ||
            p.gstin?.toLowerCase().includes(q),
        )
        .slice(0, 8),
      items: items
        .filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.itemCode?.toLowerCase().includes(q) ||
            i.hsnSac?.toLowerCase().includes(q),
        )
        .slice(0, 8),
      transactions: (txnData?.transactions ?? [])
        .filter(
          (t) =>
            String(t.txnNo).includes(q) ||
            t.partyName?.toLowerCase().includes(q) ||
            t.refNo?.toLowerCase().includes(q) ||
            TXN_META[t.txnType].label.toLowerCase().includes(q),
        )
        .slice(0, 10),
    };
  }, [q, parties, items, txnData]);

  const loading = pLoading || iLoading || tLoading;
  const total =
    results.parties.length + results.items.length + results.transactions.length;

  return (
    <div className="mx-auto max-w-3xl p-5">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <Search size={19} className="text-accent" />
        Open Anything
      </h1>
      <p className="mt-0.5 text-[13px] text-ink-soft">
        Search parties, items and documents. Press Ctrl+F from anywhere to get here.
      </p>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Type a party, item, invoice number…"
        className="mt-4"
      />

      {loading && !q ? (
        <Spinner />
      ) : !q ? (
        <p className="mt-10 text-center text-[13px] text-ink-faint">
          Start typing to search across your business.
        </p>
      ) : total === 0 ? (
        <p className="mt-10 text-center text-[13px] text-ink-faint">
          Nothing matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {results.parties.length > 0 && (
            <Section title="Parties" icon={<Users size={15} />}>
              {results.parties.map((p) => (
                <Row
                  key={p.id}
                  href="/parties"
                  primary={p.name}
                  secondary={p.phone ?? p.gstin ?? '—'}
                  trailing={formatCurrency(Math.abs(num(p.balance)))}
                />
              ))}
            </Section>
          )}

          {results.items.length > 0 && (
            <Section title="Items" icon={<Package size={15} />}>
              {results.items.map((i) => (
                <Row
                  key={i.id}
                  href="/items"
                  primary={i.name}
                  secondary={`${i.itemCode ? i.itemCode + ' · ' : ''}${formatCurrency(i.salePrice)}`}
                  trailing={i.type === 'product' ? `${num(i.stockQty)} ${i.unitShort}` : 'Service'}
                />
              ))}
            </Section>
          )}

          {results.transactions.length > 0 && (
            <Section title="Transactions" icon={<FileText size={15} />}>
              {results.transactions.map((t) => (
                <Row
                  key={t.id}
                  href={`/txn/${t.id}`}
                  primary={`${TXN_META[t.txnType].label} #${t.txnNo}`}
                  secondary={`${t.partyName ?? '—'} · ${formatDate(t.txnDate)}`}
                  trailing={formatCurrency(t.totalAmount)}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card padded={false}>
      <h2 className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-[13px] font-semibold text-ink-soft">
        {icon}
        {title}
      </h2>
      <div className="divide-y divide-line">{children}</div>
    </Card>
  );
}

function Row({
  href,
  primary,
  secondary,
  trailing,
}: {
  href: string;
  primary: string;
  secondary: string;
  trailing: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-canvas"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">{primary}</p>
        <p className="truncate text-[12px] text-ink-faint">{secondary}</p>
      </div>
      <span className="shrink-0 text-[13px] text-ink-soft">{trailing}</span>
      <CornerDownLeft
        size={14}
        className="shrink-0 text-ink-faint opacity-0 transition group-hover:opacity-100"
      />
    </Link>
  );
}
