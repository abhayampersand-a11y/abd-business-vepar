'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, Plus, Check } from 'lucide-react';

export type ComboOption = {
  value: number | string;
  label: string;
  /** Secondary line, e.g. a phone number or the price. */
  hint?: string;
  /** Right-aligned meta, e.g. current stock. */
  meta?: string;
};

/**
 * Type-to-search picker used for parties and items. Falls back to letting the
 * user keep free text (Vyapar allows billing a one-off name), and can offer to
 * create the record inline.
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
  const ref = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        if (allowFreeText && query.trim()) onChange(null, null, query.trim());
        setQuery('');
      }
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
    }
  };

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

      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full min-w-56 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-lg">
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
                  {o.hint && <span className="block truncate text-[11.5px] text-ink-faint">{o.hint}</span>}
                </span>
                {o.meta && <span className="shrink-0 text-[12px] text-ink-soft">{o.meta}</span>}
                {o.value === value && <Check size={14} className="shrink-0 text-accent" />}
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-[13px] text-ink-faint">
              {query ? 'No matches' : 'Nothing to show yet'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
