'use client';

import { TrendingUp } from 'lucide-react';
import { FeaturePage } from '@/components/layout/FeaturePage';

export default function Page() {
  return (
    <FeaturePage
      icon={TrendingUp}
      title={"Grow Your Business"}
      subtitle={"Marketing and collection tools that turn your billing data into repeat business."}
      features={[
        { title: "Payment reminders", body: "Chase overdue invoices automatically over WhatsApp and SMS." },
        { title: "Greetings and offers", body: "Send festival greetings and offer cards branded with your logo." },
        { title: "Online store", body: "Publish your catalogue and take orders without building a website." },
      ]}
      primaryAction={{ label: "See who owes you", href: "/reports/sale-aging" }}
    />
  );
}
