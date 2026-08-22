'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Button, Card } from '@/components/ui';

export type Feature = { title: string; body: string };

/**
 * Shell for the screens that describe a capability rather than list data —
 * WhatsApp Connect, Tally sync, and the other capability screens.
 */
export function FeaturePage({
  icon: Icon,
  title,
  subtitle,
  features,
  primaryAction,
  secondaryAction,
  note,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  features: Feature[];
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  note?: string;
}) {
  return (
    <div className="flex min-h-full flex-col items-center gap-6 px-6 py-12 text-center">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{subtitle}</p>
      </div>

      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-accent-soft">
        <Icon size={52} className="text-accent" />
      </div>

      <div className="grid w-full max-w-4xl gap-3 sm:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} className="text-left">
            <p className="text-[13.5px] font-medium text-ink">{f.title}</p>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{f.body}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {primaryAction && (
          <Link href={primaryAction.href}>
            <Button>{primaryAction.label}</Button>
          </Link>
        )}
        {secondaryAction && (
          <Link href={secondaryAction.href}>
            <Button variant="secondary" icon={<ChevronRight size={15} />}>
              {secondaryAction.label}
            </Button>
          </Link>
        )}
      </div>

      {note && <p className="max-w-xl text-[12.5px] text-ink-faint">{note}</p>}
    </div>
  );
}
