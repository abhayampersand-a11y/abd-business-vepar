'use client';

import { useState } from 'react';
import { Modal, Button, Field, Input, Select, Textarea, Toggle } from '@/components/ui';
import { useAddPartyMutation, useUpdatePartyMutation } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';
import { INDIAN_STATES } from '@/lib/constants';
import { isValidGSTIN, toISODate, num } from '@/lib/format';
import type { Party } from '@/types';

type Draft = {
  name: string;
  phone: string;
  email: string;
  gstin: string;
  gstType: string;
  partyType: 'customer' | 'supplier' | 'both';
  billingAddress: string;
  shippingAddress: string;
  state: string;
  partyGroup: string;
  creditLimit: string;
  openingBalance: string;
  openingBalanceType: 'to_receive' | 'to_pay';
  openingDate: string;
};

const draftFromParty = (party: Party): Draft => ({
  name: party.name,
  phone: party.phone ?? '',
  email: party.email ?? '',
  gstin: party.gstin ?? '',
  gstType: party.gstType ?? 'unregistered',
  partyType: party.partyType,
  billingAddress: party.billingAddress ?? '',
  shippingAddress: party.shippingAddress ?? '',
  state: party.state ?? '',
  partyGroup: party.partyGroup ?? 'General',
  creditLimit: party.creditLimit ?? '',
  openingBalance: party.openingBalance ?? '',
  openingBalanceType: party.openingBalanceType,
  openingDate: party.openingDate ?? toISODate(),
});

const emptyDraft = (): Draft => ({
  name: '',
  phone: '',
  email: '',
  gstin: '',
  gstType: 'unregistered',
  partyType: 'customer',
  billingAddress: '',
  shippingAddress: '',
  state: '',
  partyGroup: 'General',
  creditLimit: '',
  openingBalance: '',
  openingBalanceType: 'to_receive',
  openingDate: toISODate(),
});

export function PartyFormModal({
  open,
  onClose,
  party,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  party?: Party | null;
  onSaved?: (party: Party) => void;
}) {
  const dispatch = useAppDispatch();
  const [addParty, { isLoading: adding }] = useAddPartyMutation();
  const [updateParty, { isLoading: updating }] = useUpdatePartyMutation();

  // Mounted fresh each time it opens (the caller keys it), so the initial
  // value can simply come from the record being edited.
  const [draft, setDraft] = useState<Draft>(() => (party ? draftFromParty(party) : emptyDraft()));
  const [tab, setTab] = useState<'gst' | 'address' | 'credit'>('gst');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = 'Party name is required';
    if (draft.gstin && !isValidGSTIN(draft.gstin)) next.gstin = 'That GSTIN does not look valid';
    if (draft.phone && !/^[0-9+\-\s]{6,15}$/.test(draft.phone)) {
      next.phone = 'Enter a valid phone number';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;

    const payload = {
      ...draft,
      gstin: draft.gstin.trim().toUpperCase() || null,
      creditLimit: draft.creditLimit ? num(draft.creditLimit) : null,
      openingBalance: num(draft.openingBalance),
    };

    try {
      const saved = party
        ? await updateParty({ id: party.id, ...payload }).unwrap()
        : await addParty(payload).unwrap();
      dispatch(pushToast(party ? 'Party updated' : `${saved.name} added`, 'success'));
      onSaved?.(saved);
      onClose();
    } catch (err) {
      const message =
        (err as { data?: { error?: string } })?.data?.error ?? 'Could not save this party';
      dispatch(pushToast(message, 'error'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={party ? 'Edit Party' : 'Add Party'}
      width="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={adding || updating}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Party Name" required error={errors.name}>
          <Input
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Sharma Traders"
            autoFocus
          />
        </Field>
        <Field label="Phone Number" error={errors.phone}>
          <Input
            value={draft.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="10-digit mobile"
          />
        </Field>
        <Field label="Party Type">
          <Select
            value={draft.partyType}
            onChange={(e) => set('partyType', e.target.value as Draft['partyType'])}
          >
            <option value="customer">Customer</option>
            <option value="supplier">Supplier</option>
            <option value="both">Both</option>
          </Select>
        </Field>
      </div>

      <div className="mt-5 flex gap-1 border-b border-line">
        {(
          [
            ['gst', 'GST & Address'],
            ['address', 'Shipping Address'],
            ['credit', 'Credit & Balance'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`border-b-2 px-4 py-2 text-[13px] font-medium transition ${
              tab === id
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-faint hover:text-ink-soft'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {tab === 'gst' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GSTIN" error={errors.gstin} hint="15 characters, e.g. 24AAAAA0000A1Z5">
              <Input
                value={draft.gstin}
                onChange={(e) => set('gstin', e.target.value.toUpperCase())}
                placeholder="Enter GSTIN"
                maxLength={15}
              />
            </Field>
            <Field label="GST Type">
              <Select value={draft.gstType} onChange={(e) => set('gstType', e.target.value)}>
                <option value="unregistered">Unregistered/Consumer</option>
                <option value="registered">Registered Business — Regular</option>
                <option value="composition">Registered Business — Composition</option>
                <option value="overseas">Overseas</option>
                <option value="sez">SEZ</option>
              </Select>
            </Field>
            <Field label="State">
              <Select value={draft.state} onChange={(e) => set('state', e.target.value)}>
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="name@business.com"
              />
            </Field>
            <Field label="Billing Address" className="sm:col-span-2">
              <Textarea
                value={draft.billingAddress}
                onChange={(e) => set('billingAddress', e.target.value)}
                placeholder="Street, city, pincode"
              />
            </Field>
          </div>
        )}

        {tab === 'address' && (
          <div className="grid gap-4">
            <Field
              label="Shipping Address"
              hint="Leave blank to use the billing address on invoices."
            >
              <Textarea
                value={draft.shippingAddress}
                onChange={(e) => set('shippingAddress', e.target.value)}
              />
            </Field>
            <Field label="Party Group">
              <Input
                value={draft.partyGroup}
                onChange={(e) => set('partyGroup', e.target.value)}
                placeholder="General"
              />
            </Field>
          </div>
        )}

        {tab === 'credit' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opening Balance">
              <Input
                type="number"
                value={draft.openingBalance}
                onChange={(e) => set('openingBalance', e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Balance Type">
              <div className="flex h-9.5 items-center">
                <Toggle
                  checked={draft.openingBalanceType === 'to_pay'}
                  onChange={(v) => set('openingBalanceType', v ? 'to_pay' : 'to_receive')}
                  labelOff="To Receive"
                  labelOn="To Pay"
                />
              </div>
            </Field>
            <Field label="As of Date">
              <Input
                type="date"
                value={draft.openingDate}
                onChange={(e) => set('openingDate', e.target.value)}
              />
            </Field>
            <Field label="Credit Limit" hint="Warns you when a party crosses this amount.">
              <Input
                type="number"
                value={draft.creditLimit}
                onChange={(e) => set('creditLimit', e.target.value)}
                placeholder="No limit"
              />
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}
