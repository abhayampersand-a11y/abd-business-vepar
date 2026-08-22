'use client';

import { useState } from 'react';
import { Check, Crown } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { formatAmountShort } from '@/lib/format';

const PLANS = [
  {
    name: 'Silver',
    monthly: 299,
    yearly: 2999,
    tagline: 'For a single shop finding its feet.',
    features: [
      'Unlimited invoices and estimates',
      'Parties, items and stock tracking',
      'GST invoicing and GSTR-1',
      'Expense and payment tracking',
      '1 user, 1 device',
    ],
  },
  {
    name: 'Gold',
    monthly: 499,
    yearly: 4999,
    tagline: 'For a growing business with a team.',
    popular: true,
    features: [
      'Everything in Silver',
      'Multi-user access with roles',
      'WhatsApp Connect and reminders',
      'Barcode generation and POS billing',
      'Bill-wise profit and party-wise P&L',
      '2 users, unlimited devices',
    ],
  },
  {
    name: 'Platinum',
    monthly: 899,
    yearly: 8999,
    tagline: 'For multi-branch operations.',
    features: [
      'Everything in Gold',
      'Unlimited firms and godowns',
      'Tally import and export',
      'Salesman tracking',
      'Accountant access and priority support',
      'Unlimited users',
    ],
  },
];

export default function PlansPage() {
  const [yearly, setYearly] = useState(true);

  return (
    <div className="p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-ink">Plans & Pricing</h1>
        <p className="mt-1.5 text-[13.5px] text-ink-soft">
          Your free plan has expired. Pick a plan to keep billing without limits.
        </p>

        <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-canvas p-1">
          <button
            onClick={() => setYearly(false)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
              !yearly ? 'bg-white text-ink shadow-sm' : 'text-ink-soft'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
              yearly ? 'bg-white text-ink shadow-sm' : 'text-ink-soft'
            }`}
          >
            Yearly
            <Badge tone="success">Save 17%</Badge>
          </button>
        </div>
      </div>

      <div className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={`relative flex flex-col ${plan.popular ? 'border-brand ring-1 ring-brand/30' : ''}`}
          >
            {plan.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-0.5 text-[11px] font-medium text-white">
                Most Popular
              </span>
            )}

            <div className="flex items-center gap-1.5">
              <Crown
                size={16}
                className={plan.name === 'Platinum' ? 'text-accent' : 'text-gold'}
              />
              <h2 className="text-[15px] font-semibold text-ink">{plan.name}</h2>
            </div>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">{plan.tagline}</p>

            <p className="mt-4">
              <span className="text-2xl font-semibold text-ink">
                {formatAmountShort(yearly ? plan.yearly : plan.monthly)}
              </span>
              <span className="text-[13px] text-ink-faint"> / {yearly ? 'year' : 'month'}</span>
            </p>

            <ul className="mt-4 flex-1 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12.5px] text-ink">
                  <Check size={14} className="mt-0.5 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant={plan.popular ? 'primary' : 'secondary'}
              className="mt-5 w-full"
              onClick={() =>
                window.open('https://vyaparapp.in/pricing', '_blank', 'noopener,noreferrer')
              }
            >
              Buy {plan.name}
            </Button>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-center text-[12.5px] text-ink-faint">
        Prices are indicative. Billing is handled on the Vyapar website.
      </p>
    </div>
  );
}
