'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, MoreVertical, Circle } from 'lucide-react';
import { useGetBootstrapQuery, useGetMeQuery } from '@/store/api';
import { Menu } from '@/components/ui';

/** Persisted redux key — must match the `key` in `persistReducer`. */
const PERSIST_KEY = 'persist:vyapar-root';

export function Topbar() {
  const router = useRouter();
  const { data } = useGetBootstrapQuery();
  const { data: me } = useGetMeQuery();
  const firmName = data?.firm?.name;
  const needsSetup = !firmName || firmName === 'My Company';

  const user = me?.user;
  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? '?';

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });

    // The RTK Query cache is persisted to localStorage, so it has to go too —
    // otherwise the next person to sign in on this browser would be handed the
    // previous user's parties and invoices out of the cache.
    try {
      window.localStorage.removeItem(PERSIST_KEY);
    } catch {
      // Private mode or blocked storage: the server session is gone regardless.
    }

    // A full document load rather than router.push: it also drops the
    // in-memory redux store, not just the persisted copy.
    window.location.href = new URL('/login', window.location.origin).toString();
  }

  return (
    <header className="glass no-print flex h-16 shrink-0 items-center gap-3 rounded-[26px] px-5">
      <Link
        href="/settings/profile"
        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[15px] font-medium text-ink transition hover:bg-white/70"
      >
        <Circle size={8} className="fill-gold text-gold" />
        {needsSetup ? 'Enter Business Name' : firmName}
      </Link>

      <div className="ml-auto flex items-center gap-2.5">
        <Link
          href="/txn/new/sale"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-5 text-[13.5px] font-medium text-white shadow-[0_10px_22px_-12px_rgb(28_27_24/0.7)] transition hover:bg-brand-dark"
        >
          <Plus size={16} />
          Add Sale
        </Link>

        <Link
          href="/txn/new/purchase"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-gold px-5 text-[13.5px] font-medium text-ink shadow-[0_10px_22px_-12px_rgb(200_150_20/0.7)] transition hover:brightness-97"
        >
          <Plus size={16} />
          Add Purchase
        </Link>

        <Menu
          trigger={
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/75 text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.9)] ring-1 ring-white/70 transition hover:bg-white">
              <Plus size={17} />
            </span>
          }
          items={[
            { label: 'Add Payment-In', onClick: () => router.push('/txn/new/payment_in') },
            { label: 'Add Payment-Out', onClick: () => router.push('/txn/new/payment_out') },
            { label: 'Add Expense', onClick: () => router.push('/txn/new/expense') },
            { label: 'Add Estimate', onClick: () => router.push('/txn/new/estimate') },
            { label: 'Add Sale Order', onClick: () => router.push('/txn/new/sale_order') },
            { label: 'Add Party', onClick: () => router.push('/parties?new=1') },
            { label: 'Add Item', onClick: () => router.push('/items?new=1') },
          ]}
        />

        <Menu
          trigger={
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-white/80">
              <MoreVertical size={18} />
            </span>
          }
          items={[
            { label: 'Settings', onClick: () => router.push('/settings') },
            { label: 'Business Profile', onClick: () => router.push('/settings/profile') },
            { label: 'Verify My Data', onClick: () => router.push('/utilities/verify') },
            { label: 'Backup & Restore', onClick: () => router.push('/sync/backup') },
          ]}
        />

        <Menu
          trigger={
            <span
              title={user?.email ?? undefined}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgb(28_27_24/0.7)] transition hover:brightness-125"
            >
              {initial}
            </span>
          }
          items={[
            { label: user?.name ?? 'Account', onClick: () => router.push('/settings') },
            { label: 'Sign out', onClick: signOut },
          ]}
        />
      </div>
    </header>
  );
}
