'use client';

import { useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, ListFilter } from 'lucide-react';

export type Column<T> = {
  key: string;
  header: ReactNode;
  /** Value used for sorting and for the header filter list. */
  value?: (row: T) => string | number | null | undefined;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  sortable?: boolean;
  /** Show the little funnel that filters by distinct values, as Vyapar does. */
  filterable?: boolean;
  className?: string;
};

type Props<T> = {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  selectedKey?: string | number | null;
  empty?: ReactNode;
  dense?: boolean;
  footer?: ReactNode;
  stickyHeader?: boolean;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectedKey,
  empty,
  dense,
  footer,
  stickyHeader = true,
}: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const valueOf = (col: Column<T>, row: T) => {
    if (col.value) return col.value(row);
    return (row as Record<string, unknown>)[col.key] as string | number | null | undefined;
  };

  const filtered = useMemo(() => {
    const active = Object.entries(filters).filter(([, set]) => set.size > 0);
    if (!active.length) return rows;
    return rows.filter((row) =>
      active.every(([key, set]) => {
        const col = columns.find((c) => c.key === key);
        if (!col) return true;
        return set.has(String(valueOf(col, row) ?? ''));
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filters, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = valueOf(col, a);
      const bv = valueOf(col, b);
      const an = typeof av === 'number' ? av : Number(av);
      const bn = typeof bv === 'number' ? bv : Number(bv);
      let cmp: number;
      if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== '' && bv !== '') cmp = an - bn;
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort, columns]);

  const distinct = (col: Column<T>) => {
    const set = new Set<string>();
    for (const r of rows) set.add(String(valueOf(col, r) ?? ''));
    return [...set].sort();
  };

  const toggleFilterValue = (key: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      const set = new Set(next[key] ?? []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next[key] = set;
      return next;
    });
  };

  if (!rows.length && empty) return <>{empty}</>;

  const pad = dense ? 'px-3.5 py-2.5' : 'px-5 py-3.5';

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-[13px]">
        <thead className={clsx(stickyHeader && 'sticky top-0 z-10')}>
          <tr className="bg-white/85 backdrop-blur">
            {columns.map((col) => {
              const isSorted = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={clsx(
                    'select-none border-b border-line text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint',
                    dense ? 'px-3.5 py-2.5' : 'px-5 py-3',
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left',
                  )}
                >
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1.5',
                      col.align === 'right' && 'flex-row-reverse',
                    )}
                  >
                    <button
                      type="button"
                      disabled={col.sortable === false}
                      onClick={() =>
                        setSort((prev) =>
                          prev?.key === col.key
                            ? { key: col.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                            : { key: col.key, dir: 'asc' },
                        )
                      }
                      className={clsx(
                        'inline-flex items-center gap-1',
                        col.sortable !== false && 'hover:text-ink',
                      )}
                    >
                      {col.header}
                      {isSorted &&
                        (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </button>

                    {col.filterable && (
                      <span className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenFilter(openFilter === col.key ? null : col.key)}
                          className={clsx(
                            'rounded p-0.5 transition hover:bg-line',
                            filters[col.key]?.size ? 'text-brand' : 'text-ink-faint',
                          )}
                          aria-label={`Filter by ${col.key}`}
                        >
                          <ListFilter size={12} />
                        </button>
                        {openFilter === col.key && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setOpenFilter(null)}
                            />
                            <div className="absolute left-0 z-30 mt-1 max-h-64 w-52 overflow-y-auto rounded-2xl border border-line bg-white p-2 text-left shadow-xl">
                              <button
                                className="mb-1 w-full rounded px-2 py-1 text-left text-[12px] text-accent hover:bg-canvas"
                                onClick={() =>
                                  setFilters((p) => ({ ...p, [col.key]: new Set<string>() }))
                                }
                              >
                                Clear filter
                              </button>
                              {distinct(col).map((v) => (
                                <label
                                  key={v}
                                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[12.5px] font-normal text-ink hover:bg-canvas"
                                >
                                  <input
                                    type="checkbox"
                                    checked={filters[col.key]?.has(v) ?? false}
                                    onChange={() => toggleFilterValue(col.key, v)}
                                    className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                                  />
                                  <span className="truncate">{v || '—'}</span>
                                </label>
                              ))}
                            </div>
                          </>
                        )}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {sorted.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'border-b border-line/60 transition-colors last:border-0',
                  onRowClick && 'cursor-pointer',
                  selectedKey === key ? 'bg-gold-soft' : 'hover:bg-gold-soft/45',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      pad,
                      'text-ink',
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                          ? 'text-center'
                          : 'text-left',
                      col.className,
                    )}
                  >
                    {col.render ? col.render(row) : String(valueOf(col, row) ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
          {!sorted.length && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-12 text-center text-[13px] text-ink-faint"
              >
                No rows match the current filters.
              </td>
            </tr>
          )}
        </tbody>

        {footer && (
          <tfoot className="sticky bottom-0 bg-white/90 backdrop-blur">
            <tr>
              <td colSpan={columns.length} className="border-t border-line px-4 py-2.5">
                {footer}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
