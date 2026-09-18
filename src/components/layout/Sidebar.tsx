'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Plus, Search, Building2, Crown } from 'lucide-react';
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
        'glass no-print relative z-30 flex shrink-0 flex-col rounded-[26px] text-rail-text transition-all duration-200',
        collapsed ? 'w-[76px]' : 'w-[248px]',
      )}
    >
      {/* Brand */}
      <div className={clsx('flex items-center gap-2.5 px-5 pb-1 pt-5', collapsed && 'justify-center px-0')}>
        <Crown size={22} className="shrink-0 fill-gold/80 text-gold" />
        {!collapsed && (
          <span className="truncate text-[16px] font-semibold tracking-tight text-ink">Dhandho</span>
        )}
      </div>

      {/* Global search */}
      <div className="px-3 pb-3 pt-3">
        <Link
          href="/search"
          className={clsx(
            'flex h-10 items-center gap-2 rounded-full bg-white/70 px-3.5 text-[13px] text-ink-soft shadow-sm ring-1 ring-white/70 transition hover:bg-white',
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
        className="absolute -right-3 top-5 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-white text-ink-soft shadow-sm transition hover:text-ink"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} className="rotate-90" />}
      </button>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
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
                  'group relative my-1 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13.5px] transition',
                  active
                    ? 'bg-rail-active font-medium text-white shadow-[0_10px_22px_-10px_rgb(28_27_24/0.65),0_0_24px_-8px_rgb(240_192_46/0.45)]'
                    : 'hover:bg-rail-hover hover:text-ink',
                )}
              >
                {active && collapsed && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold" />
                )}
                <Icon size={18} className={clsx('shrink-0', active && 'text-gold')} />
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
                    className="rounded p-0.5 text-rail-muted opacity-0 transition group-hover:opacity-100 hover:text-ink"
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
                  'relative my-0.5 flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-[13.5px] transition',
                  active
                    ? 'bg-rail-active font-medium text-white shadow-[0_10px_22px_-10px_rgb(28_27_24/0.65),0_0_24px_-8px_rgb(240_192_46/0.45)]'
                    : 'hover:bg-rail-hover hover:text-ink',
                )}
              >
                <Icon size={18} className={clsx('shrink-0', active && 'text-gold')} />
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
                          'group relative my-0.5 flex items-center gap-2 rounded-xl py-2 pl-10 pr-3 text-[13px] transition',
                          childActive
                            ? 'bg-rail-active font-medium text-white shadow-[0_10px_22px_-10px_rgb(28_27_24/0.65),0_0_24px_-8px_rgb(240_192_46/0.45)]'
                            : 'text-rail-text hover:bg-rail-hover hover:text-ink',
                        )}
                      >
                        <span className="flex-1 truncate">{child.label}</span>
                        {child.quickAdd && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(child.quickAdd!);
                            }}
                            className="rounded p-0.5 text-rail-muted opacity-0 transition group-hover:opacity-100 hover:text-ink"
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


      {/* Firm switcher */}
      <Link
        href="/settings/profile"
        className={clsx(
          'm-2 flex items-center gap-2.5 rounded-2xl bg-white/60 px-3 py-2.5 text-[13px] text-ink transition hover:bg-white',
          collapsed && 'justify-center px-0',
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold text-[11px] font-semibold text-ink">
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
