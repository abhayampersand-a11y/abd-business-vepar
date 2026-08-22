'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Routes that render on their own, without the sidebar and top bar. */
const BARE_ROUTES = new Set(['/login', '/register']);

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (BARE_ROUTES.has(pathname)) return <>{children}</>;

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
