'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { useGetBootstrapQuery, useUpdateFirmMutation } from '@/store/api';
import { Button, Card, Field, Input, Select, Spinner } from '@/components/ui';
import { BUSINESS_CATEGORIES, BUSINESS_TYPES, INDIAN_STATES } from '@/lib/constants';
import { formatCurrency, formatDate, toISODate } from '@/lib/format';
import { useAppDispatch } from '@/store/hooks';
import type { BootstrapPayload } from '@/types';
import { pushToast } from '@/store/uiSlice';

/** The two-step "Set Up My Business" wizard, with a live invoice preview. */
export default function SetupPage() {
  const { data: bootstrap, isLoading } = useGetBootstrapQuery();

  if (isLoading || !bootstrap?.firm) return <Spinner />;

  return <SetupWizard key={bootstrap.firm.id} firm={bootstrap.firm} />;
}

function SetupWizard({ firm }: { firm: NonNullable<BootstrapPayload['firm']> }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [updateFirm, { isLoading: saving }] = useUpdateFirmMutation();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(() => ({
    name: firm.name ?? '',
    phone: firm.phone ?? '',
    businessCategory: firm.businessCategory ?? '',
    businessType: firm.businessType ?? '',
    gstin: firm.gstin ?? '',
    state: firm.state ?? '',
    address: firm.address ?? '',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  const next = () => {
    const e: Record<string, string> = {};
    if (!draft.name.trim()) e.name = 'Company name is required';
    if (!draft.phone.trim()) e.phone = 'Phone number is required';
    if (!draft.businessCategory) e.businessCategory = 'Choose a business category';
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep(2);
  };

  const finish = async () => {
    try {
      await updateFirm({ ...draft, gstin: draft.gstin.toUpperCase() || null }).unwrap();
      dispatch(pushToast('Business set up — you are ready to bill', 'success'));
      router.push('/');
    } catch {
      dispatch(pushToast('Could not save your business details', 'error'));
    }
  };

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-lg font-semibold text-ink">Set Up My Business</h1>
        <div className="flex items-center gap-2">
          <StepDot n={1} active={step === 1} done={step > 1} />
          <span className="h-px w-8 bg-line-strong" />
          <StepDot n={2} active={step === 2} done={false} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-[14.5px] font-semibold text-ink">
            {step === 1 ? 'Enter Business Details' : 'Tax & Address'}
          </h2>

          {step === 1 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Company Name" required error={errors.name}>
                <Input
                  value={draft.name}
                  onChange={(e) => set({ name: e.target.value })}
                  autoFocus
                />
              </Field>
              <Field label="Phone Number" required error={errors.phone}>
                <Input value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
              </Field>
              <Field
                label="Choose Business Category"
                required
                error={errors.businessCategory}
                className="sm:col-span-2"
              >
                <Select
                  value={draft.businessCategory}
                  onChange={(e) => set({ businessCategory: e.target.value })}
                >
                  <option value="">Select</option>
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Business Type">
                <Select
                  value={draft.businessType}
                  onChange={(e) => set({ businessType: e.target.value })}
                >
                  <option value="">Select</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="GSTIN">
                <Input
                  value={draft.gstin}
                  onChange={(e) => set({ gstin: e.target.value.toUpperCase() })}
                  maxLength={15}
                />
              </Field>
              <Field label="State" hint="Decides CGST+SGST vs IGST on your invoices.">
                <Select value={draft.state} onChange={(e) => set({ state: e.target.value })}>
                  <option value="">Select</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Business Address" className="sm:col-span-2">
                <Input value={draft.address} onChange={(e) => set({ address: e.target.value })} />
              </Field>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            {step === 2 && (
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
            )}
            {step === 1 ? (
              <Button icon={<ArrowRight size={15} />} onClick={next}>
                Next
              </Button>
            ) : (
              <Button icon={<Check size={15} />} onClick={finish} loading={saving}>
                Finish Setup
              </Button>
            )}
          </div>
        </Card>

        {/* Live preview */}
        <Card padded={false}>
          <p className="border-b border-line px-4 py-2.5 text-center text-[13px] font-medium text-ink-soft">
            Sample Tax Invoice
          </p>
          <div className="p-4">
            <div className="rounded border border-line p-3">
              <p className="text-[14px] font-bold text-ink">{draft.name || 'My Company'}</p>
              <p className="text-[11px] text-ink-soft">Phone: {draft.phone || '—'}</p>
              {draft.gstin && <p className="text-[11px] text-ink-soft">GSTIN: {draft.gstin}</p>}
              {draft.address && <p className="text-[11px] text-ink-soft">{draft.address}</p>}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded border border-line p-2">
                <p className="font-semibold text-ink-soft">Bill To</p>
                <p className="text-ink">Sample Party</p>
                <p className="text-ink-faint">Sample address</p>
              </div>
              <div className="rounded border border-line p-2">
                <p className="font-semibold text-ink-soft">Invoice Details</p>
                <p className="text-ink">No: Sample-01</p>
                <p className="text-ink-faint">Date: {formatDate(toISODate())}</p>
              </div>
            </div>

            <table className="mt-2 w-full text-[10.5px]">
              <thead>
                <tr className="bg-canvas text-ink-soft">
                  <th className="border border-line px-1.5 py-1 text-left">Item</th>
                  <th className="border border-line px-1.5 py-1 text-right">Qty</th>
                  <th className="border border-line px-1.5 py-1 text-right">Rate</th>
                  <th className="border border-line px-1.5 py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-line px-1.5 py-1">Sample Item</td>
                  <td className="border border-line px-1.5 py-1 text-right">1</td>
                  <td className="border border-line px-1.5 py-1 text-right">600.00</td>
                  <td className="border border-line px-1.5 py-1 text-right">708.00</td>
                </tr>
                <tr className="font-semibold">
                  <td className="border border-line px-1.5 py-1" colSpan={3}>
                    Total
                  </td>
                  <td className="border border-line px-1.5 py-1 text-right">
                    {formatCurrency(708, { symbol: false })}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-6 border-t border-line pt-2 text-right text-[10.5px] text-ink-faint">
              For {draft.name || 'My Company'}
              <p className="mt-5">Authorised Signatory</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11.5px] font-semibold ${
        done
          ? 'bg-success text-white'
          : active
            ? 'bg-accent text-white'
            : 'bg-canvas text-ink-faint'
      }`}
    >
      {done ? <Check size={13} /> : n}
    </span>
  );
}
