'use client';

import { Barcode } from 'lucide-react';
import { FeaturePage } from '@/components/layout/FeaturePage';

export default function Page() {
  return (
    <FeaturePage
      icon={Barcode}
      title={"Barcode Generator"}
      subtitle={"Design and print barcode labels for your items, sized for standard label rolls."}
      features={[
        { title: "Bulk label printing", body: "Print a whole rack of labels in one pass." },
        { title: "Custom layouts", body: "Choose what appears on the label — price, MRP, item code." },
        { title: "Scanner ready", body: "Codes work with any standard USB or Bluetooth scanner." },
      ]}
      premium
      primaryAction={{ label: "Back to Items", href: "/items" }}
      secondaryAction={{ label: 'See Plans', href: '/plans' }}
    />
  );
}
