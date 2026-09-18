'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Routes that render on their own, without the sidebar and top bar. */
const BARE_ROUTES = new Set(['/login', '/register']);

/**
 * Extra softness on top of the body's radial light: warm sun from the upper
 * right, a gentler glow down the right edge, and a cool haze on the left.
 * Never takes a click and is dropped from print.
 */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="no-print pointer-events-none fixed inset-0 overflow-hidden">
      <div className="blob -right-40 -top-56 h-[40rem] w-[40rem] bg-[#f7d56a] opacity-45" />
      <div className="blob -right-24 top-1/3 h-[28rem] w-[26rem] bg-[#fbe3a0] opacity-35" />
      <div className="blob -bottom-64 right-10 h-[30rem] w-[34rem] bg-[#f9dc8c] opacity-25" />
      <div className="blob -left-48 top-10 h-[34rem] w-[30rem] bg-[#e3e7ee] opacity-50" />
    </div>
  );
}

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // /i/<code> is what a phone opens from an item's QR label — a phone-sized page of its own.
  if (BARE_ROUTES.has(pathname) || pathname.startsWith('/i/')) {
    return (
      <>
        <Backdrop />
        <div className="relative z-10">{children}</div>
      </>
    );
  }

  // Cards sit directly on the lit background — no opaque page container in between.
  return (
    <>
      <Backdrop />
      <div className="relative z-10 flex h-screen gap-4 overflow-hidden p-4">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-y-auto rounded-[26px]">{children}</main>
        </div>
      </div>
    </>
  );
}
