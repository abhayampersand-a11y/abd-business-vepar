'use client';

import { ArrowUpFromLine } from 'lucide-react';
import { FeaturePage } from '@/components/layout/FeaturePage';

export default function Page() {
  return (
    <FeaturePage
      icon={ArrowUpFromLine}
      title={"Export To Tally"}
      subtitle={"Hand your accountant a Tally-ready file at the end of every month."}
      features={[
        { title: "Tally XML", body: "Vouchers export in the format Tally imports directly." },
        { title: "Period selection", body: "Export just the month or quarter your accountant asked for." },
        { title: "Reconciliation summary", body: "A cover sheet showing totals so nothing goes missing." },
      ]}
      primaryAction={{ label: "Export as CSV", href: "/utilities/export-items" }}
      note={"CSV exports of items, parties and transactions are available now."}
    />
  );
}
