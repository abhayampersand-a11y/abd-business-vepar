'use client';

import { Layers } from 'lucide-react';
import { FeaturePage } from '@/components/layout/FeaturePage';

export default function Page() {
  return (
    <FeaturePage
      icon={Layers}
      title={"Update Items In Bulk"}
      subtitle={"Change prices, tax rates and stock across many items at once instead of one at a time."}
      features={[
        { title: "Price revisions", body: "Apply a percentage change across a category in one go." },
        { title: "Tax rate changes", body: "Move a whole group of items to a new GST slab." },
        { title: "Stock corrections", body: "Reconcile counted stock against the system in bulk." },
      ]}
      primaryAction={{ label: "Import Items", href: "/utilities/import-items" }}
      note={"Items can be edited one at a time today, and created in bulk from a spreadsheet."}
    />
  );
}
