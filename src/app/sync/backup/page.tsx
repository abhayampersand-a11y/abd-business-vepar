'use client';

import { CloudUpload } from 'lucide-react';
import { FeaturePage } from '@/components/layout/FeaturePage';

export default function Page() {
  return (
    <FeaturePage
      icon={CloudUpload}
      title={"Backup Your Data"}
      subtitle={"Your data lives in a hosted Postgres database, so it is already stored off this machine."}
      features={[
        { title: "Always-on storage", body: "Every save is written straight to the database, not a local file." },
        { title: "Point-in-time recovery", body: "The database provider keeps rolling backups of the instance." },
        { title: "Portable exports", body: "Download CSVs any time you want a copy of your own." },
      ]}
      primaryAction={{ label: "Export Data", href: "/utilities/export-items" }}
      note={"Use Export Data for a snapshot you can keep yourself."}
    />
  );
}
