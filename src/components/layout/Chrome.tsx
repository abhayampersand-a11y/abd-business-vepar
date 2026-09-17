'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Routes that render on their own, without the sidebar and top bar. */
const BARE_ROUTES = new Set(['/login', '/register']);

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // /i/<code> is what a phone opens from an item's QR label — a phone-sized page of its own.
  if (BARE_ROUTES.has(pathname) || pathname.startsWith('/i/')) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
