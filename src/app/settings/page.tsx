'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Settings as SettingsIcon, Building2, ChevronRight } from 'lucide-react';
import { useGetBootstrapQuery, useUpdateSettingsMutation } from '@/store/api';
import { Card, Spinner, Toggle, Select, Field } from '@/components/ui';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';

type ToggleSetting = {
  key: string;
  label: string;
  description: string;
  defaultOn?: boolean;
};

const GROUPS: Array<{ title: string; settings: ToggleSetting[] }> = [
  {
    title: 'General',
    settings: [
      {
        key: 'gst_enabled',
        label: 'GST',
        description: 'Show GST fields on invoices and enable the GST reports.',
        defaultOn: true,
      },
      {
        key: 'stock_enabled',
        label: 'Stock / Inventory',
        description: 'Track quantities on hand and warn when stock runs low.',
        defaultOn: true,
      },
      {
        key: 'round_off_enabled',
        label: 'Round off invoice total',
        description: 'Round the final amount to the nearest rupee by default.',
        defaultOn: true,
      },
      {
        key: 'passcode_enabled',
        label: 'Require a passcode',
        description: 'Ask for a passcode before the app opens on this device.',
      },
    ],
  },
  {
    title: 'Transaction',
    settings: [
      {
        key: 'due_date_enabled',
        label: 'Due date & payment terms',
        description: 'Capture payment terms and flag invoices as overdue.',
        defaultOn: true,
      },
      {
        key: 'transport_details_enabled',
        label: 'Transportation details',
        description: 'Add transporter, vehicle number and delivery location.',
      },
      {
        key: 'eway_bill_enabled',
        label: 'E-way bill number',
        description: 'Record the e-way bill number against a document.',
      },
      {
        key: 'free_qty_enabled',
        label: 'Free item quantity',
        description: 'Bill a quantity as free alongside the charged quantity.',
      },
    ],
  },
  {
    title: 'Item',
    settings: [
      {
        key: 'item_barcode_enabled',
        label: 'QR / barcode scanning',
        description: 'Add items to an invoice by scanning their QR label or barcode.',
        defaultOn: true,
      },
      {
        key: 'item_wise_discount',
        label: 'Item-wise discount',
        description: 'Apply a discount on each line rather than the whole invoice.',
        defaultOn: true,
      },
      {
        key: 'item_wise_tax',
        label: 'Item-wise tax',
        description: 'Choose the GST rate per line.',
        defaultOn: true,
      },
    ],
  },
  {
    title: 'Party',
    settings: [
      {
        key: 'party_grouping',
        label: 'Party grouping',
        description: 'Group parties so you can report on them together.',
        defaultOn: true,
      },
      {
        key: 'party_credit_limit',
        label: 'Credit limit',
        description: 'Warn when a party crosses their agreed credit limit.',
      },
      {
        key: 'party_shipping_address',
        label: 'Shipping address',
        description: 'Keep a delivery address separate from the billing address.',
        defaultOn: true,
      },
    ],
  },
];

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { data: bootstrap, isLoading } = useGetBootstrapQuery();
  const [updateSettings] = useUpdateSettingsMutation();
  const [pending, setPending] = useState<Record<string, boolean>>({});

  if (isLoading) return <Spinner />;

  const settings = bootstrap?.settings ?? {};

  const valueOf = (s: ToggleSetting) => {
    if (s.key in pending) return pending[s.key];
    const stored = settings[s.key];
    if (stored === undefined || stored === null) return Boolean(s.defaultOn);
    return stored === 'true';
  };

  const toggle = async (s: ToggleSetting, next: boolean) => {
    setPending((p) => ({ ...p, [s.key]: next }));
    try {
      await updateSettings({ [s.key]: next }).unwrap();
      dispatch(pushToast(`${s.label} ${next ? 'enabled' : 'disabled'}`, 'success'));
    } catch {
      setPending((p) => ({ ...p, [s.key]: !next }));
      dispatch(pushToast('Could not save that setting', 'error'));
    }
  };

  return (
    <div className="p-5">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <SettingsIcon size={19} className="text-accent" />
        Settings
      </h1>
      <p className="mt-0.5 text-[13px] text-ink-soft">
        Turn features on or off to match how your business bills.
      </p>

      <Link href="/settings/profile">
        <Card className="mt-4 flex items-center gap-3 transition hover:border-accent">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Building2 size={19} />
          </span>
          <div className="flex-1">
            <p className="text-[14px] font-medium text-ink">Business Profile</p>
            <p className="text-[12.5px] text-ink-soft">
              {bootstrap?.firm?.name ?? 'My Company'} — name, GSTIN, address, logo and signature
            </p>
          </div>
          <ChevronRight size={17} className="text-ink-faint" />
        </Card>
      </Link>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {GROUPS.map((group) => (
          <Card key={group.title} padded={false}>
            <h2 className="border-b border-line px-4 py-3 text-[14px] font-semibold text-ink">
              {group.title}
            </h2>
            <div className="divide-y divide-line">
              {group.settings.map((s) => (
                <div key={s.key} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-[13.5px] font-medium text-ink">{s.label}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{s.description}</p>
                  </div>
                  <div className="pt-0.5">
                    <Toggle checked={valueOf(s)} onChange={(v) => toggle(s, v)} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}

        <Card padded={false}>
          <h2 className="border-b border-line px-4 py-3 text-[14px] font-semibold text-ink">
            Formats
          </h2>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label="Currency">
              <Select
                value={settings.currency_symbol ?? '₹'}
                onChange={(e) => updateSettings({ currency_symbol: e.target.value })}
              >
                <option value="₹">₹ Indian Rupee</option>
                <option value="$">$ US Dollar</option>
                <option value="£">£ Pound Sterling</option>
                <option value="€">€ Euro</option>
              </Select>
            </Field>
            <Field label="Date Format">
              <Select
                value={settings.date_format ?? 'dd/mm/yyyy'}
                onChange={(e) => updateSettings({ date_format: e.target.value })}
              >
                <option value="dd/mm/yyyy">dd/mm/yyyy</option>
                <option value="mm/dd/yyyy">mm/dd/yyyy</option>
              </Select>
            </Field>
          </div>
        </Card>
      </div>
    </div>
  );
}
