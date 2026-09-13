'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ChevronDown, Plus, Check } from 'lucide-react';

export type ComboOption = {
  value: number | string;
  label: string;
  /** Secondary line, e.g. a phone number or the price. */
  hint?: string;
  /** Right-aligned meta, e.g. the price. */
  meta?: string;
  /** Second right-aligned line under `meta`, e.g. current stock. */
  metaHint?: string;
};

type MenuRect = { top: number; left: number; width: number; maxHeight: number };

/** Matches the old max-h-72. */
const MENU_MAX = 288;
const GAP = 4;
const EDGE = 8;

/**
 * Type-to-search picker used for parties and items. Falls back to letting the
 * user keep free text (Vyapar allows billing a one-off name), and can offer to
 * create the record inline.
 *
 * The menu renders in a portal, positioned against the input's viewport rect:
 * line items sit inside a scrolling table inside an `overflow-hidden` card, and
 * an absolutely positioned menu gets clipped by them.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Search',
  onCreate,
  createLabel = 'Add new',
  allowFreeText = false,
  className,
  inputClassName,
  autoFocus,
  disabled,
}: {
  value: number | string | null;
  onChange: (value: number | string | null, option: ComboOption | null, text: string) => void;
  options: ComboOption[];
  placeholder?: string;
  onCreate?: (text: string) => void;
  createLabel?: string;
  allowFreeText?: boolean;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState<MenuRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  // While closed the input shows the selection; while open it shows the query.
  const display = open ? query : (selected?.label ?? (allowFreeText ? String(value ?? '') : ''));

  const filtered = useMemo(() => {
    if (!query.trim()) return options.slice(0, 60);
    const q = query.toLowerCase();
    return options
      .filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q))
      .slice(0, 60);
  }, [options, query]);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    // Flip above the input only when there is genuinely more room up there.
    const dropDown = below >= Math.min(MENU_MAX, 180) || below >= above;
    const maxHeight = Math.max(120, Math.min(MENU_MAX, dropDown ? below : above));
    const width = Math.max(r.width, 224);
    const left = Math.min(Math.max(EDGE, r.left), Math.max(EDGE, window.innerWidth - width - EDGE));
    setRect({
      top: dropDown ? r.bottom + GAP : Math.max(EDGE, r.top - GAP - maxHeight),
      left,
      width,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    // Any ancestor scroll — the item table, the form body, the page — moves the
    // anchor, so keep following it while the menu is open.
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      if (allowFreeText && query.trim()) onChange(null, null, query.trim());
      setQuery('');
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, query, allowFreeText, onChange]);

  const pick = (option: ComboOption) => {
    onChange(option.value, option, option.label);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault();
        pick(filtered[highlight]);
      } else if (allowFreeText && query.trim()) {
        e.preventDefault();
        onChange(null, null, query.trim());
        setOpen(false);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    } else if (e.key === 'Tab') {
      // Tabbing out of a portalled menu would otherwise leave it hanging.
      if (allowFreeText && query.trim()) onChange(null, null, query.trim());
      setOpen(false);
      setQuery('');
    }
  };

  const menu =
    open && rect ? (
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          maxHeight: rect.maxHeight,
          zIndex: 60,
        }}
        className="overflow-y-auto overscroll-contain rounded-lg border border-line bg-white py-1 shadow-lg"
      >
        {onCreate && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onCreate(query.trim());
              setOpen(false);
              setQuery('');
            }}
            className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left text-[13px] font-medium text-accent hover:bg-accent-soft"
          >
            <Plus size={14} />
            {query.trim() ? `${createLabel}: "${query.trim()}"` : createLabel}
          </button>
        )}

        {filtered.length ? (
          filtered.map((o, i) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o)}
              onMouseEnter={() => setHighlight(i)}
              className={clsx(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition',
                i === highlight ? 'bg-accent-soft' : 'hover:bg-canvas',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink">{o.label}</span>
                {o.hint && (
                  <span className="block truncate text-[11.5px] text-ink-faint">{o.hint}</span>
                )}
              </span>
              {(o.meta || o.metaHint) && (
                <span className="shrink-0 text-right">
                  {o.meta && <span className="block text-[12px] text-ink-soft">{o.meta}</span>}
                  {o.metaHint && (
                    <span className="block text-[11.5px] text-ink-faint">{o.metaHint}</span>
                  )}
                </span>
              )}
              {o.value === value && <Check size={14} className="shrink-0 text-accent" />}
            </button>
          ))
        ) : (
          <p className="px-3 py-3 text-[13px] text-ink-faint">
            {query ? 'No matches' : 'Nothing to show yet'}
          </p>
        )}
      </div>
    ) : null;

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <div className="relative">
        <input
          ref={inputRef}
          value={display}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery('');
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          className={clsx(
            'h-9.5 w-full rounded-lg border border-line-strong bg-white px-3 pr-8 text-sm text-ink placeholder:text-ink-faint',
            'focus:border-accent focus:ring-3 focus:ring-accent/15 focus:outline-none disabled:bg-canvas',
            inputClassName,
          )}
        />
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
        />
      </div>

      {menu && typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </div>
  );
}
