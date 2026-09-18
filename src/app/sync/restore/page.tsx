'use client';

import { CloudDownload } from 'lucide-react';
import { FeaturePage } from '@/components/layout/FeaturePage';

export default function Page() {
  return (
    <FeaturePage
      icon={CloudDownload}
      title={"Restore Data"}
      subtitle={"Bring data back in from a backup file or another Dhandho company."}
      features={[
        { title: "CSV restore", body: "Re-import items and parties from any spreadsheet you exported." },
        { title: "Merge or replace", body: "Choose whether to add to what is here or start clean." },
        { title: "Preview first", body: "See what will be created before anything is written." },
      ]}
      primaryAction={{ label: "Import Items", href: "/utilities/import-items" }}
      note={"Items and parties can be restored from CSV today."}
    />
  );
}
