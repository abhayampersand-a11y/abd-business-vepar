'use client';

import { useState } from 'react';
import { Building2, Save, UploadCloud } from 'lucide-react';
import { useGetBootstrapQuery, useUpdateFirmMutation } from '@/store/api';
import { Button, Card, Field, Input, Select, Textarea, Spinner } from '@/components/ui';
import { INDIAN_STATES, BUSINESS_CATEGORIES, BUSINESS_TYPES } from '@/lib/constants';
import { isValidGSTIN, toISODate } from '@/lib/format';
import { useAppDispatch } from '@/store/hooks';
import type { BootstrapPayload } from '@/types';
import { pushToast } from '@/store/uiSlice';

type Draft = {
  name: string;
  phone: string;
  email: string;
  gstin: string;
  businessType: string;
  businessCategory: string;
  state: string;
  pincode: string;
  address: string;
  logoUrl: string;
  signatureUrl: string;
  booksBeginDate: string;
};

export default function BusinessProfilePage() {
  const { data: bootstrap, isLoading } = useGetBootstrapQuery();

  if (isLoading || !bootstrap?.firm) return <Spinner />;

  // Keyed on the firm so the form is built once from loaded data.
  return <ProfileForm key={bootstrap.firm.id} firm={bootstrap.firm} />;
}

function ProfileForm({ firm }: { firm: NonNullable<BootstrapPayload['firm']> }) {
  const dispatch = useAppDispatch();
  const [updateFirm, { isLoading: saving }] = useUpdateFirmMutation();

  const [draft, setDraft] = useState<Draft>(() => ({
    name: firm.name ?? '',
    phone: firm.phone ?? '',
    email: firm.email ?? '',
    gstin: firm.gstin ?? '',
    businessType: firm.businessType ?? '',
    businessCategory: firm.businessCategory ?? '',
    state: firm.state ?? '',
    pincode: firm.pincode ?? '',
    address: firm.address ?? '',
    logoUrl: firm.logoUrl ?? '',
    signatureUrl: firm.signatureUrl ?? '',
    booksBeginDate: firm.booksBeginDate ?? toISODate(),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const readImage = (file: File, key: 'logoUrl' | 'signatureUrl') => {
    if (file.size > 400_000) {
      dispatch(pushToast('Pick an image under 400KB', 'error'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set(key, String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = 'Business name is required';
    if (draft.gstin && !isValidGSTIN(draft.gstin)) next.gstin = 'That GSTIN does not look valid';
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      await updateFirm({ ...draft, gstin: draft.gstin.toUpperCase() || null }).unwrap();
      dispatch(pushToast('Business profile saved', 'success'));
    } catch {
      dispatch(pushToast('Could not save the profile', 'error'));
    }
  };

  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Building2 size={19} className="text-accent" />
            Business Profile
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            These details appear on every invoice you print or share.
          </p>
        </div>
        <Button icon={<Save size={16} />} onClick={save} loading={saving}>
          Save Changes
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business Name" required error={errors.name} className="sm:col-span-2">
              <Input value={draft.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Phone Number">
              <Input value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Email ID">
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
            <Field label="GSTIN" error={errors.gstin}>
              <Input
                value={draft.gstin}
                onChange={(e) => set('gstin', e.target.value.toUpperCase())}
                maxLength={15}
                placeholder="Enter GSTIN"
              />
            </Field>
            <Field label="Business Type">
              <Select
                value={draft.businessType}
                onChange={(e) => set('businessType', e.target.value)}
              >
                <option value="">Select Business Type</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Business Category">
              <Select
                value={draft.businessCategory}
                onChange={(e) => set('businessCategory', e.target.value)}
              >
                <option value="">Select Business Category</option>
                {BUSINESS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="State" hint="Decides CGST+SGST vs IGST on your invoices.">
              <Select value={draft.state} onChange={(e) => set('state', e.target.value)}>
                <option value="">Select State</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Pincode">
              <Input value={draft.pincode} onChange={(e) => set('pincode', e.target.value)} />
            </Field>
            <Field label="Account Books Beginning Date">
              <Input
                type="date"
                value={draft.booksBeginDate}
                onChange={(e) => set('booksBeginDate', e.target.value)}
              />
            </Field>
            <Field label="Business Address" className="sm:col-span-2">
              <Textarea value={draft.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <p className="text-[13px] font-medium text-ink-soft">Business Logo</p>
            <label className="mt-2 flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-line-strong transition hover:border-accent">
              {draft.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-[12.5px] text-ink-faint">
                  <UploadCloud size={22} />
                  Add Logo
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) readImage(f, 'logoUrl');
                }}
              />
            </label>
            {draft.logoUrl && (
              <button
                onClick={() => set('logoUrl', '')}
                className="mt-2 text-[12px] text-danger hover:underline"
              >
                Remove logo
              </button>
            )}
          </Card>

          <Card>
            <p className="text-[13px] font-medium text-ink-soft">Signature</p>
            <label className="mt-2 flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-line-strong transition hover:border-accent">
              {draft.signatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.signatureUrl}
                  alt="Signature"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="flex flex-col items-center gap-1 text-[12.5px] text-ink-faint">
                  <UploadCloud size={20} />
                  Upload Signature
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) readImage(f, 'signatureUrl');
                }}
              />
            </label>
            {draft.signatureUrl && (
              <button
                onClick={() => set('signatureUrl', '')}
                className="mt-2 text-[12px] text-danger hover:underline"
              >
                Remove signature
              </button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
