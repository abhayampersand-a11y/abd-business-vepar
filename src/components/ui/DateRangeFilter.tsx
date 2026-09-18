'use client';

import { Calendar } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRange } from '@/store/uiSlice';
import {
  DATE_RANGE_LABELS,
  resolveDateRange,
  type DateRangeKey,
} from '@/lib/format';
import { Select } from './index';

/**
 * The "Filter by" strip every list screen carries. The chosen window is kept
 * in Redux per screen, so it survives navigation and a reload.
 */
export function useDateRange(scope: string, fallback: DateRangeKey = 'this_month') {
  const dispatch = useAppDispatch();
  const stored = useAppSelector((s) => s.ui.dateRange[scope]);
  const key = stored?.key ?? fallback;
  const preset = resolveDateRange(key);
  const from = stored?.from ?? preset.from;
  const to = stored?.to ?? preset.to;

  const set = (next: { key?: DateRangeKey; from?: string; to?: string }) => {
    const nextKey = next.key ?? key;
    if (next.key && next.key !== 'custom') {
      const p = resolveDateRange(next.key);
      dispatch(setDateRange({ scope, key: next.key, from: p.from, to: p.to }));
    } else {
      dispatch(
        setDateRange({
          scope,
          key: nextKey,
          from: next.from ?? from,
          to: next.to ?? to,
        }),
      );
    }
  };

  return { key, from, to, set };
}

export function DateRangeFilter({
  scope,
  fallback,
  extra,
}: {
  scope: string;
  fallback?: DateRangeKey;
  extra?: React.ReactNode;
}) {
  const { key, from, to, set } = useDateRange(scope, fallback);

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-white/60 bg-white/45 backdrop-blur-sm px-5 py-2.5">
      <span className="text-[13px] font-medium text-ink-soft">Filter by :</span>

      <Select
        value={key}
        onChange={(e) => set({ key: e.target.value as DateRangeKey })}
        className="h-8.5 w-44 rounded-full bg-accent-soft text-[13px] font-medium text-ink"
      >
        {Object.entries(DATE_RANGE_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </Select>

      <div className="flex h-8.5 items-center gap-2 rounded-full bg-accent-soft px-3 text-[13px]">
        <Calendar size={14} className="text-ink-soft" />
        <input
          type="date"
          value={from}
          onChange={(e) => set({ key: 'custom', from: e.target.value })}
          className="bg-transparent text-[13px] text-ink outline-none"
        />
        <span className="text-ink-faint">To</span>
        <input
          type="date"
          value={to}
          onChange={(e) => set({ key: 'custom', to: e.target.value })}
          className="bg-transparent text-[13px] text-ink outline-none"
        />
      </div>

      {extra}
    </div>
  );
}
