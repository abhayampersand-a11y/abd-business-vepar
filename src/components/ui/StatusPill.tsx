'use client';

import { Badge } from './index';
import { toISODate, daysBetween } from '@/lib/format';

/** The coloured payment state shown in every transaction list. */
export function StatusPill({ status, dueDate }: { status: string; dueDate?: string | null }) {
  switch (status) {
    case 'paid':
      return <Badge tone="success">Paid</Badge>;
    case 'partial':
      return <Badge tone="warning">Partial</Badge>;
    case 'cancelled':
      return <Badge tone="neutral">Cancelled</Badge>;
    case 'open':
      return <Badge tone="accent">Open</Badge>;
    case 'converted':
      return <Badge tone="neutral">Converted</Badge>;
    case 'closed':
      return <Badge tone="neutral">Closed</Badge>;
    case 'overdue': {
      const days = dueDate ? Math.max(0, daysBetween(dueDate, toISODate())) : 0;
      return <Badge tone="warning">{days ? `Overdue ${days}d` : 'Overdue'}</Badge>;
    }
    default:
      return <Badge tone="danger">Unpaid</Badge>;
  }
}
