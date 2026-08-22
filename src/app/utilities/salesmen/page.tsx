'use client';

import { MapPin } from 'lucide-react';
import { FeaturePage } from '@/components/layout/FeaturePage';

export default function Page() {
  return (
    <FeaturePage
      icon={MapPin}
      title={"Track Your Salesmen"}
      subtitle={"Give each salesman a login, then see who billed what and where."}
      features={[
        { title: "Per-user logins", body: "Each salesman gets their own account with limited access." },
        { title: "Sales by person", body: "Compare performance across the team in one report." },
        { title: "Field visibility", body: "See the orders raised on the road as they happen." },
      ]}
      primaryAction={{ label: "See all transactions", href: "/reports/all-transactions" }}
    />
  );
}
