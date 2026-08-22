'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Plus, Search, Crown, Building2 } from 'lucide-react';
import { NAV, type NavItem } from './nav';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar } from '@/store/uiSlice';
import { useGetBootstrapQuery } from '@/store/api';

function isActive(pathname: string, href?: string) {
  if (!href) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function groupContains(pathname: string, item: NavItem) {
  return item.children?.some((c) => isActive(pathname, c.href)) ?? false;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const { data: bootstrap } = useGetBootstrapQuery();

  // Only the user's explicit toggles are stored; the group holding the current
  // page is expanded by derivation, so navigating never needs an effect.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  // Ctrl+F opens the global search, matching the desktop app's shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        router.push('/search');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return (
    <aside
      className={clsx(
        'no-print relative z-30 flex shrink-0 flex-col bg-rail text-rail-text transition-all duration-200',
        collapsed ? 'w-[68px]' : 'w-[245px]',
      )}
    >
      {/* Global search */}
      <div className="px-3 pt-3 pb-2">
        <Link
          href="/search"
          className={clsx(
            'flex h-9 items-center gap-2 rounded-full bg-[#0e1631] px-3 text-[13px] text-rail-muted transition hover:bg-[#0b1229]',
            collapsed && 'justify-center px-0',
          )}
        >
          <Search size={15} />
          {!collapsed && <span className="truncate">Open Anything (Ctrl+F)</span>}
        </Link>
      </div>

      {/* Collapse handle */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="absolute -right-3 top-4 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-white text-ink-soft shadow-sm transition hover:text-ink"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} className="rotate-90" />}
      </button>

      <nav className="flex-1 overflow-y-auto pb-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href) || groupContains(pathname, item);
          const expanded = toggled[item.label] ?? groupContains(pathname, item);

          if (!item.children) {
            return (
              <Link
                key={item.label}
                href={item.href!}
                title={collapsed ? item.label : undefined}
                className={clsx(
                  'group relative flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition',
                  active
                    ? 'bg-rail-active font-medium text-white'
                    : 'hover:bg-rail-hover hover:text-white',
                )}
              >
                {active && <span className="absolute left-0 top-0 h-full w-[3px] bg-brand" />}
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && item.quickAdd && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(item.quickAdd!);
                    }}
                    className="rounded p-0.5 text-rail-muted opacity-0 transition group-hover:opacity-100 hover:text-white"
                  >
                    <Plus size={15} />
                  </span>
                )}
              </Link>
            );
          }

          return (
            <div key={item.label}>
              <button
                onClick={() => setToggled((prev) => ({ ...prev, [item.label]: !expanded }))}
                title={collapsed ? item.label : undefined}
                className={clsx(
                  'relative flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13.5px] transition',
                  active
                    ? 'bg-rail-active font-medium text-white'
                    : 'hover:bg-rail-hover hover:text-white',
                )}
              >
                {active && <span className="absolute left-0 top-0 h-full w-[3px] bg-brand" />}
                <Icon size={18} className="shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    <ChevronDown
                      size={15}
                      className={clsx('transition-transform', expanded && 'rotate-180')}
                    />
                  </>
                )}
              </button>

              {expanded && !collapsed && (
                <div className="pb-1">
                  {item.children.map((child) => {
                    const childActive = isActive(pathname, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={clsx(
                          'group relative flex items-center gap-2 py-2 pl-12 pr-4 text-[13px] transition',
                          childActive
                            ? 'bg-rail-active font-medium text-white'
                            : 'text-rail-text hover:bg-rail-hover hover:text-white',
                        )}
                      >
                        {childActive && (
                          <span className="absolute left-0 top-0 h-full w-[3px] bg-brand" />
                        )}
                        <span className="flex-1 truncate">{child.label}</span>
                        {child.premium && (
                          <Crown size={13} className="shrink-0 text-[#4aa3ff]" />
                        )}
                        {child.quickAdd && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(child.quickAdd!);
                            }}
                            className="rounded p-0.5 text-rail-muted opacity-0 transition group-hover:opacity-100 hover:text-white"
                          >
                            <Plus size={14} />
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Promo card */}
      {!collapsed && (
        <div className="mx-3 mb-2 rounded-lg bg-gold-soft p-3">
          <p className="text-[15px] font-bold text-ink">417 users</p>
          <p className="mt-0.5 text-[11.5px] leading-tight text-ink-soft">
            got Vyapar Premium in last 24hrs!
          </p>
          <Link
            href="/plans"
            className="mt-2.5 flex items-center justify-between rounded-md bg-[#2b2b2b] px-2.5 py-2 text-[12.5px] font-medium text-white transition hover:bg-black"
          >
            <span className="flex items-center gap-1.5">
              <Crown size={14} className="text-gold" />
              Get Vyapar Premium
            </span>
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Firm switcher */}
      <Link
        href="/settings/profile"
        className={clsx(
          'flex items-center gap-2.5 border-t border-white/10 px-4 py-3 text-[13px] transition hover:bg-rail-hover',
          collapsed && 'justify-center px-0',
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white">
          {(bootstrap?.firm?.name ?? 'M').charAt(0).toUpperCase()}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{bootstrap?.firm?.name ?? 'My Company'}</span>
            <ChevronRight size={14} className="text-rail-muted" />
          </>
        )}
        {collapsed && <Building2 size={0} />}
      </Link>
    </aside>
  );
}
