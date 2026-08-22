'use client';

import { Network } from 'lucide-react';
import { FeaturePage } from '@/components/layout/FeaturePage';

export default function Page() {
  return (
    <FeaturePage
      icon={Network}
      title={"Vyapar Network"}
      subtitle={"Discover verified suppliers and distributors already billing on Vyapar, and let them find you."}
      features={[
        { title: "Verified businesses", body: "Every listing is tied to a GSTIN-verified account." },
        { title: "One-tap enquiries", body: "Send a purchase enquiry without re-keying your details." },
        { title: "Get discovered", body: "Your catalogue becomes searchable to buyers near you." },
      ]}
      premium
      primaryAction={{ label: "See Plans", href: "/plans" }}
      secondaryAction={{ label: 'See Plans', href: '/plans' }}
    />
  );
}
