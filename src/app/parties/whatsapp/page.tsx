'use client';

import { MessageCircle } from 'lucide-react';
import { FeaturePage } from '@/components/layout/FeaturePage';

export default function Page() {
  return (
    <FeaturePage
      icon={MessageCircle}
      title={"WhatsApp Connect"}
      subtitle={"Send invoices, payment reminders and updates to your customers on WhatsApp without leaving Dhandho."}
      features={[
        { title: "Share invoices instantly", body: "Send a PDF straight to the customer as soon as you save the bill." },
        { title: "Automatic payment reminders", body: "Nudge overdue parties on a schedule you decide." },
        { title: "Delivery reports", body: "See which messages landed and which bounced." },
      ]}
      primaryAction={{ label: "Back to Parties", href: "/parties" }}
      note={"The WhatsApp icon on each party already opens a chat with that contact."}
    />
  );
}
