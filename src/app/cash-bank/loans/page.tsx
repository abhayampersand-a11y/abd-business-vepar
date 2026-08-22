'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Landmark, LayoutDashboard, Calculator, ListChecks, Trash2 } from 'lucide-react';
import {
  useGetLoansQuery,
  useAddLoanMutation,
  useAddLoanTransactionMutation,
  useDeleteLoanMutation,
  useGetBankAccountsQuery,
} from '@/store/api';
import {
  Button,
  Spinner,
  Card,
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  Menu,
  ConfirmDialog,
} from '@/components/ui';
import { formatCurrency, formatDate, toISODate, num, round2 } from '@/lib/format';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';
import type { LoanRow } from '@/types';
import { MoreVertical } from 'lucide-react';

export default function LoansPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoansScreen />
    </Suspense>
  );
}

function LoansScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const { data: loans = [], isLoading } = useGetLoansQuery();
  // ?new=1 opens the add form on arrival.
  const [addOpen, setAddOpen] = useState(() => searchParams.get('new') !== null);
  const [paymentFor, setPaymentFor] = useState<LoanRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LoanRow | null>(null);
  const [deleteLoan, { isLoading: deleting }] = useDeleteLoanMutation();

  if (isLoading) return <Spinner />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line bg-white px-5 py-3">
        <h1 className="text-lg font-semibold text-ink">Loan Accounts</h1>
        <Button icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
          Add Loan Account
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loans.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loans.map((loan) => {
              const progress =
                num(loan.openingBalance) > 0
                  ? Math.min(100, round2((loan.principalPaid / num(loan.openingBalance)) * 100))
                  : 0;
              return (
                <Card key={loan.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[15px] font-semibold text-ink">{loan.lenderName}</h3>
                      <p className="text-[12px] text-ink-faint">
                        {loan.loanType || 'Loan'}
                        {loan.accountNumber ? ` · ${loan.accountNumber}` : ''}
                      </p>
                    </div>
                    <Menu
                      trigger={
                        <span className="rounded-full p-1 text-ink-faint transition hover:bg-canvas">
                          <MoreVertical size={16} />
                        </span>
                      }
                      items={[
                        { label: 'Record EMI / Payment', onClick: () => setPaymentFor(loan) },
                        {
                          label: 'Delete Loan',
                          danger: true,
                          icon: <Trash2 size={14} />,
                          onClick: () => setConfirmDelete(loan),
                        },
                      ]}
                    />
                  </div>

                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[12px] text-ink-faint">Outstanding</p>
                      <p className="text-xl font-semibold text-ink">
                        {formatCurrency(loan.currentBalance)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] text-ink-faint">Interest Rate</p>
                      <p className="text-[14px] font-medium text-ink">{num(loan.interestRate)}%</p>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
                    <div className="h-full bg-success" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11.5px] text-ink-soft">
                    <span>Principal paid {formatCurrency(loan.principalPaid)}</span>
                    <span>Interest {formatCurrency(loan.interestPaid)}</span>
                  </div>

                  {loan.openingDate && (
                    <p className="mt-2 text-[11.5px] text-ink-faint">
                      Started {formatDate(loan.openingDate)}
                      {loan.termMonths ? ` · ${loan.termMonths} months` : ''}
                    </p>
                  )}

                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 w-full"
                    onClick={() => setPaymentFor(loan)}
                  >
                    Record EMI
                  </Button>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 py-10 text-center">
            <div>
              <h2 className="text-xl font-semibold text-ink">Manage Your Loan Accounts</h2>
              <p className="mt-1.5 text-[13.5px] text-ink-soft">
                Add your loan accounts and check all loan transactions at one place
              </p>
            </div>

            <div className="flex h-36 w-36 items-center justify-center rounded-full bg-accent-soft">
              <Landmark size={58} className="text-accent" />
            </div>

            <div className="grid w-full max-w-4xl gap-3 sm:grid-cols-3">
              <Feature
                icon={<LayoutDashboard size={18} />}
                title="All Loans, One Dashboard"
                body="Easily track business loans kept separate from the daily transactions"
              />
              <Feature
                icon={<Calculator size={18} />}
                title="Auto EMI Calculation with Every Entry"
                body="Add loan details and the system instantly breaks it down into EMIs"
              />
              <Feature
                icon={<ListChecks size={18} />}
                title="Manual Flexibility"
                body="Add notes, interest details etc. Keeps it flexible for varied use cases"
              />
            </div>

            <Button icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
              Add Loan Account
            </Button>
          </div>
        )}
      </div>

      {addOpen && (
        <AddLoanModal
          open
          onClose={() => {
            setAddOpen(false);
            if (searchParams.get('new') !== null) router.replace('/cash-bank/loans');
          }}
        />
      )}
      {paymentFor && (
        <LoanPaymentModal key={paymentFor.id} loan={paymentFor} onClose={() => setPaymentFor(null)} />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete loan account"
        message={`Delete the loan from ${confirmDelete?.lenderName}? Its EMI history goes with it.`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          await deleteLoan(confirmDelete.id).unwrap();
          dispatch(pushToast('Loan account deleted', 'success'));
          setConfirmDelete(null);
        }}
        loading={deleting}
      />
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="text-left">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {icon}
        </span>
        <div>
          <p className="text-[13.5px] font-medium text-ink">{title}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{body}</p>
        </div>
      </div>
    </Card>
  );
}

function AddLoanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [addLoan, { isLoading }] = useAddLoanMutation();
  const [draft, setDraft] = useState(() => ({
    lenderName: '',
    accountNumber: '',
    loanType: 'Business Loan',
    openingBalance: '',
    interestRate: '',
    termMonths: '',
    openingDate: toISODate(),
    description: '',
  }));
  const [error, setError] = useState('');

  // Flat EMI preview so the user sees the monthly cost before saving.
  const emi = (() => {
    const p = num(draft.openingBalance);
    const r = num(draft.interestRate) / 12 / 100;
    const n = num(draft.termMonths);
    if (p <= 0 || n <= 0) return 0;
    if (r === 0) return round2(p / n);
    return round2((p * r * (1 + r) ** n) / ((1 + r) ** n - 1));
  })();

  const save = async () => {
    if (!draft.lenderName.trim()) {
      setError('Lender name is required');
      return;
    }
    await addLoan({
      ...draft,
      openingBalance: num(draft.openingBalance),
      interestRate: num(draft.interestRate),
      termMonths: draft.termMonths ? Number(draft.termMonths) : null,
    }).unwrap();
    dispatch(pushToast('Loan account added', 'success'));
    onClose();
  };

  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Loan Account"
      width="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={isLoading}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lender Name" required error={error}>
          <Input
            value={draft.lenderName}
            onChange={(e) => set({ lenderName: e.target.value })}
            placeholder="e.g. HDFC Bank"
            autoFocus
          />
        </Field>
        <Field label="Account Number">
          <Input
            value={draft.accountNumber}
            onChange={(e) => set({ accountNumber: e.target.value })}
          />
        </Field>
        <Field label="Loan Type">
          <Select value={draft.loanType} onChange={(e) => set({ loanType: e.target.value })}>
            <option>Business Loan</option>
            <option>Term Loan</option>
            <option>Working Capital</option>
            <option>Vehicle Loan</option>
            <option>Personal Loan</option>
            <option>Gold Loan</option>
            <option>Other</option>
          </Select>
        </Field>
        <Field label="Loan Amount">
          <Input
            type="number"
            value={draft.openingBalance}
            onChange={(e) => set({ openingBalance: e.target.value })}
            placeholder="0.00"
          />
        </Field>
        <Field label="Interest Rate (% p.a.)">
          <Input
            type="number"
            value={draft.interestRate}
            onChange={(e) => set({ interestRate: e.target.value })}
          />
        </Field>
        <Field label="Term (months)">
          <Input
            type="number"
            value={draft.termMonths}
            onChange={(e) => set({ termMonths: e.target.value })}
          />
        </Field>
        <Field label="Start Date">
          <Input
            type="date"
            value={draft.openingDate}
            onChange={(e) => set({ openingDate: e.target.value })}
          />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>

        {emi > 0 && (
          <p className="sm:col-span-2 rounded-lg bg-accent-soft px-4 py-2.5 text-[13px] text-ink">
            Estimated EMI: <span className="font-semibold">{formatCurrency(emi)}</span> per month
          </p>
        )}
      </div>
    </Modal>
  );
}

function LoanPaymentModal({ loan, onClose }: { loan: LoanRow | null; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [addLoanTxn, { isLoading }] = useAddLoanTransactionMutation();
  const { data: banks = [] } = useGetBankAccountsQuery();

  const [draft, setDraft] = useState(() => ({
    type: 'emi',
    amount: '',
    principal: '',
    interest: '',
    txnDate: toISODate(),
    paymentType: 'Cash',
    bankAccountId: '',
    description: '',
  }));

  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    if (!loan) return;
    await addLoanTxn({
      loanId: loan.id,
      body: {
        ...draft,
        amount: num(draft.amount),
        principal: num(draft.principal) || num(draft.amount) - num(draft.interest),
        interest: num(draft.interest),
        bankAccountId: draft.bankAccountId ? Number(draft.bankAccountId) : null,
      },
    }).unwrap();
    dispatch(pushToast('Loan payment recorded', 'success'));
    onClose();
  };

  return (
    <Modal
      open={Boolean(loan)}
      onClose={onClose}
      title={`Record payment — ${loan?.lenderName ?? ''}`}
      width="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={isLoading}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <Select value={draft.type} onChange={(e) => set({ type: e.target.value })}>
            <option value="emi">EMI Payment</option>
            <option value="interest">Interest Only</option>
            <option value="charges">Charges</option>
            <option value="processing_fee">Processing Fee</option>
            <option value="increase">Increase Loan</option>
            <option value="decrease">Decrease Loan</option>
          </Select>
        </Field>
        <Field label="Date">
          <Input
            type="date"
            value={draft.txnDate}
            onChange={(e) => set({ txnDate: e.target.value })}
          />
        </Field>
        <Field label="Total Amount" required>
          <Input
            type="number"
            value={draft.amount}
            onChange={(e) => set({ amount: e.target.value })}
            placeholder="0.00"
            autoFocus
          />
        </Field>
        <Field label="Interest Portion" hint="The rest is treated as principal.">
          <Input
            type="number"
            value={draft.interest}
            onChange={(e) => set({ interest: e.target.value })}
            placeholder="0.00"
          />
        </Field>
        <Field label="Payment Type">
          <Select value={draft.paymentType} onChange={(e) => set({ paymentType: e.target.value })}>
            <option>Cash</option>
            <option>Bank Account</option>
            <option>Cheque</option>
            <option>UPI</option>
          </Select>
        </Field>
        {draft.paymentType !== 'Cash' && (
          <Field label="Bank Account">
            <Select
              value={draft.bankAccountId}
              onChange={(e) => set({ bankAccountId: e.target.value })}
            >
              <option value="">Select account</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.accountName}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Description" className="sm:col-span-2">
          <Input
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
      </div>
    </Modal>
  );
}
