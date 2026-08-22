'use client';

import { useEffect } from 'react';
import clsx from 'clsx';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { dismissToast } from '@/store/uiSlice';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TONES = {
  success: 'border-success/30 bg-success-soft text-success',
  error: 'border-danger/30 bg-danger-soft text-danger',
  info: 'border-accent/30 bg-accent-soft text-accent',
};

export function Toaster() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      setTimeout(() => dispatch(dismissToast(t.id)), t.tone === 'error' ? 6000 : 3500),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dispatch]);

  if (!toasts.length) return null;

  return (
    <div className="no-print pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            className={clsx(
              'pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg border px-4 py-3 shadow-lg',
              TONES[t.tone],
            )}
          >
            <Icon size={17} className="mt-px shrink-0" />
            <p className="flex-1 text-[13px] leading-snug">{t.message}</p>
            <button onClick={() => dispatch(dismissToast(t.id))} aria-label="Dismiss">
              <X size={15} className="opacity-60 hover:opacity-100" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
