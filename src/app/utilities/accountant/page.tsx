'use client';

import { UserCog } from 'lucide-react';
import { FeaturePage } from '@/components/layout/FeaturePage';

export default function Page() {
  return (
    <FeaturePage
      icon={UserCog}
      title={"Accountant Access"}
      subtitle={"Invite your accountant so they can pull reports without files going back and forth."}
      features={[
        { title: "Read-only access", body: "They can see the books but cannot change your transactions." },
        { title: "Direct report access", body: "GSTR-1, GSTR-2 and P&L, always current." },
        { title: "Revoke any time", body: "Access ends the moment you remove them." },
      ]}
      primaryAction={{ label: "Export Data", href: "/utilities/export-items" }}
      note={"For now, export the reports your accountant needs and share the file."}
    />
  );
}
