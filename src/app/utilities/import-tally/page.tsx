'use client';

import { ArrowDownToLine } from 'lucide-react';
import { FeaturePage } from '@/components/layout/FeaturePage';

export default function Page() {
  return (
    <FeaturePage
      icon={ArrowDownToLine}
      title={"Import From Tally"}
      subtitle={"Bring your masters and vouchers across from Tally and carry on where you left off."}
      features={[
        { title: "Masters and ledgers", body: "Parties, items and groups arrive with their balances." },
        { title: "Voucher history", body: "Sales, purchases and payments come across with dates intact." },
        { title: "Mapping preview", body: "Check how each Tally field lands before you commit." },
      ]}
      premium
      primaryAction={{ label: "Import from CSV", href: "/utilities/import-items" }}
      secondaryAction={{ label: 'See Plans', href: '/plans' }}
      note={"A CSV export from Tally can be imported today through Import Items and Import Parties."}
    />
  );
}
