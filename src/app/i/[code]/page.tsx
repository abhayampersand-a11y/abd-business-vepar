'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  PackageSearch,
  QrCode as QrIcon,
  ScanLine,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
} from 'lucide-react';
import clsx from 'clsx';
import { useGetItemByCodeQuery, useGetItemQuery } from '@/store/api';
import { Button, Spinner } from '@/components/ui';
import { StockAdjustModal } from '@/components/items/StockAdjustModal';
import { ItemQrModal } from '@/components/items/ItemQrModal';
import { CameraScanModal } from '@/components/items/CameraScanModal';
import { TXN_META } from '@/lib/constants';
import { codeFromRouteParam, codeFromScan } from '@/lib/item-code';
import { formatCurrency, formatDate, formatQty, num } from '@/lib/format';

/**
 * Where a label's QR lands when scanned with a phone camera: the item at a
 * glance, sized for a phone, with the things you do standing at the shelf.
 * Rendered without the sidebar (see Chrome).
 */
export default function ScannedItemPage({ params }: { params: Promise<{ code: string }> }) {
  const code = codeFromRouteParam(use(params).code);
  const router = useRouter();

  const { data: item, isLoading, isError } = useGetItemByCodeQuery(code, { skip: !code });
  const { data: detail } = useGetItemQuery(item?.id ?? 0, { skip: !item });

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const header = (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-white px-3 py-2.5">
      <Link
        href="/items"
        className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[13.5px] text-ink-soft transition hover:bg-canvas"
      >
        <ArrowLeft size={16} />
        Items
      </Link>
      <Button
        size="sm"
        icon={<ScanLine size={15} />}
        className="ml-auto"
        onClick={() => setScanOpen(true)}
      >
        Scan next
      </Button>
    </header>
  );

  const scanner = scanOpen && (
    <CameraScanModal
      onClose={() => setScanOpen(false)}
      onScan={(text) => {
        const next = codeFromScan(text);
        setScanOpen(false);
        if (next) router.replace(`/i/${encodeURIComponent(next)}`);
      }}
    />
  );

  if (code && (isLoading || (!item && !isError))) {
    return (
      <div className="min-h-screen bg-canvas">
        {header}
        <Spinner label="Looking up item…" />
        {scanner}
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-canvas">
        {header}
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
          <PackageSearch size={36} className="text-ink-faint" />
          <h1 className="text-[16px] font-semibold text-ink">No item found</h1>
          <p className="text-[13.5px] text-ink-soft">
            Nothing in your items has the code{' '}
            <span className="font-mono text-ink">{code || '—'}</span>.
          </p>
          <Button icon={<ScanLine size={15} />} onClick={() => setScanOpen(true)}>
            Scan again
          </Button>
        </div>
        {scanner}
      </div>
    );
  }

  const isProduct = item.type === 'product';
  const qty = num(item.stockQty);
  const low = num(item.minStockLevel) > 0 && qty <= num(item.minStockLevel);
  const recent = detail?.transactions.slice(0, 5) ?? [];

  return (
    <div className="min-h-screen bg-canvas pb-8">
      {header}

      <main className="mx-auto flex max-w-md flex-col gap-3 p-3">
        <section className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[17px] font-semibold leading-snug text-ink">{item.name}</h1>
              <p className="mt-0.5 font-mono text-[12.5px] text-ink-soft">{item.itemCode}</p>
              <p className="mt-1 text-[12.5px] text-ink-faint">
                {[isProduct ? 'Product' : 'Service', item.categoryName, !item.isActive && 'Inactive']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <button
              onClick={() => setQrOpen(true)}
              className="shrink-0 rounded-lg border border-line p-2 text-ink-soft transition hover:border-accent hover:text-accent"
              aria-label="QR code and labels"
            >
              <QrIcon size={20} />
            </button>
          </div>

          {isProduct && (
            <div className="mt-4 rounded-xl bg-canvas px-4 py-3">
              <p className="text-[11.5px] uppercase tracking-wide text-ink-faint">In stock</p>
              <p
                className={clsx(
                  'text-[28px] font-semibold leading-tight',
                  qty < 0 ? 'text-danger' : low ? 'text-warning' : 'text-success',
                )}
              >
                {formatQty(qty)} <span className="text-[15px] font-medium">{item.unitShort}</span>
              </p>
              {low && (
                <p className="text-[12px] text-warning">
                  At or below the minimum of {formatQty(item.minStockLevel)}
                </p>
              )}
            </div>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <Fact label="Sale price" value={formatCurrency(item.salePrice)} strong />
            <Fact label="Purchase price" value={formatCurrency(item.purchasePrice)} />
            <Fact label="GST" value={`${num(item.taxRate)}%`} />
            {item.hsnSac && <Fact label={isProduct ? 'HSN' : 'SAC'} value={item.hsnSac} />}
            {item.location && <Fact label="Location" value={item.location} />}
          </dl>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <Action
            href={`/txn/new/sale?item=${item.id}`}
            icon={<ShoppingCart size={18} />}
            label="Sell"
          />
          <Action
            href={`/txn/new/purchase?item=${item.id}`}
            icon={<Truck size={18} />}
            label="Purchase"
          />
          {isProduct && (
            <button
              onClick={() => setAdjustOpen(true)}
              className="card col-span-2 flex items-center justify-center gap-2 py-3 text-[14px] font-medium text-ink transition hover:border-accent"
            >
              <SlidersHorizontal size={18} className="text-accent" />
              Adjust stock
            </button>
          )}
        </section>

        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-4 py-2.5 text-[13px] font-semibold uppercase text-ink">
            Recent transactions
          </h2>
          {recent.length ? (
            <ul>
              {recent.map((t) => (
                <li key={`${t.txnId}-${t.txnNo}`} className="border-b border-line last:border-0">
                  <Link
                    href={`/txn/${t.txnId}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition hover:bg-canvas"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] text-ink">
                        {TXN_META[t.txnType].label} #{t.txnNo}
                        {t.partyName ? ` · ${t.partyName}` : ''}
                      </p>
                      <p className="text-[12px] text-ink-faint">{formatDate(t.txnDate)}</p>
                    </div>
                    <span className="shrink-0 text-[13px] font-medium text-ink">
                      {formatQty(t.quantity)} {t.unit ?? ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-center text-[13px] text-ink-faint">
              {detail ? 'Not bought or sold yet.' : 'Loading…'}
            </p>
          )}
        </section>
      </main>

      {adjustOpen && (
        <StockAdjustModal key={item.id} open onClose={() => setAdjustOpen(false)} item={item} />
      )}
      {qrOpen && <ItemQrModal key={item.id} item={item} onClose={() => setQrOpen(false)} />}
      {scanner}
    </div>
  );
}

function Fact({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[11.5px] uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className={clsx('text-[14px] text-ink', strong ? 'font-semibold' : 'font-medium')}>
        {value}
      </dd>
    </div>
  );
}

function Action({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="card flex items-center justify-center gap-2 py-3 text-[14px] font-medium text-ink transition hover:border-accent"
    >
      <span className="text-accent">{icon}</span>
      {label}
    </Link>
  );
}
