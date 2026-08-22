'use client';

import { Monitor } from 'lucide-react';
import { FeaturePage } from '@/components/layout/FeaturePage';

export default function Page() {
  return (
    <FeaturePage
      icon={Monitor}
      title={"Vyapar POS"}
      subtitle={"A billing counter built for speed — scan, bill and take payment in a few seconds."}
      features={[
        { title: "Barcode-first billing", body: "Scan an item and it lands on the bill priced and taxed." },
        { title: "Thermal printing", body: "Prints to 2-inch and 3-inch receipt printers." },
        { title: "Offline safe", body: "Keeps billing when the connection drops, syncs when it returns." },
      ]}
      primaryAction={{ label: "Create an invoice instead", href: "/txn/new/sale" }}
    />
  );
}
