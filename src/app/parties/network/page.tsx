'use client';

import { Network } from 'lucide-react';
import { FeaturePage } from '@/components/layout/FeaturePage';

export default function Page() {
  return (
    <FeaturePage
      icon={Network}
      title={"Dhandho Network"}
      subtitle={"Discover verified suppliers and distributors already billing on Dhandho, and let them find you."}
      features={[
        { title: "Verified businesses", body: "Every listing is tied to a GSTIN-verified account." },
        { title: "One-tap enquiries", body: "Send a purchase enquiry without re-keying your details." },
        { title: "Get discovered", body: "Your catalogue becomes searchable to buyers near you." },
      ]}
    />
  );
}
