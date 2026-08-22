'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Landmark,
  Printer,
  QrCode,
  CreditCard,
  Pencil,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import {
  useGetBankAccountsQuery,
  useGetBankAccountQuery,
  useAddBankAccountMutation,
  useUpdateBankAccountMutation,
  useDeleteBankAccountMutation,
} from '@/store/api';
import {
  Button,
  Spinner,
  Card,
  Modal,
  Field,
  Input,
  Checkbox,
  Menu,
  ConfirmDialog,
} from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { formatCurrency, formatDate, toISODate, num } from '@/lib/format';
import { useSelection } from '@/lib/useSelection';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';
import type { BankAccount, BankAccountDetail } from '@/types';

export default function BankAccountsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <BankAccountsScreen />
    </Suspense>
  );
}

type StatementRow = BankAccountDetail['statement'][number];

function BankAccountsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const { data: accounts = [], isLoading } = useGetBankAccountsQuery();
  const [selectedId, setSelectedId] = useSelection(accounts, (a) => a.id);
  // ?new=1 opens the add form on arrival — read straight from the URL.
  const [formOpen, setFormOpen] = useState(() => searchParams.get('new') !== null);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BankAccount | null>(null);

  const { data: detail } = useGetBankAccountQuery({ id: selectedId! }, { skip: !selectedId });
  const [deleteAccount, { isLoading: deleting }] = useDeleteBankAccountMutation();

  const selected = useMemo(
    () => accounts.find((a) => a.id === selectedId) ?? null,
    [accounts, selectedId],
  );

  const statementColumns: Array<Column<StatementRow>> = [
    {
      key: 'date',
      header: 'Date',
      filterable: true,
      value: (r) => r.date,
      render: (r) => formatDate(r.date),
    },
    { key: 'description', header: 'Description', filterable: true },
    {
      key: 'withdrawal',
      header: 'Withdrawal Amount',
      align: 'right',
      render: (r) => (r.withdrawal ? formatCurrency(r.withdrawal) : '—'),
    },
    {
      key: 'deposit',
      header: 'Deposit Amount',
      align: 'right',
      render: (r) => (r.deposit ? formatCurrency(r.deposit) : '—'),
    },
    {
      key: 'balance',
      header: 'Balance Amount',
      align: 'right',
      render: (r) => (
        <span className={r.balance < 0 ? 'text-danger' : 'text-ink'}>
          {formatCurrency(r.balance)}
        </span>
      ),
    },
  ];

  const doDelete = async () => {
    if (!confirmDelete) return;
    await deleteAccount(confirmDelete.id).unwrap();
    dispatch(pushToast(`${confirmDelete.accountName} removed`, 'success'));
    setConfirmDelete(null);
    setSelectedId(null);
  };

  if (isLoading) return <Spinner />;

  if (!accounts.length) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-line bg-white px-5 py-3">
          <h1 className="text-lg font-semibold text-ink">Banks</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
          <div>
            <h2 className="text-xl font-semibold text-ink">Manage Multiple Bank Accounts</h2>
            <p className="mt-1.5 text-[13.5px] text-ink-soft">
              With Vyapar you can manage multiple banks and payment types like UPI, Net Banking and
              Credit Card
            </p>
          </div>

          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-accent-soft">
            <Landmark size={64} className="text-accent" />
          </div>

          <div className="grid w-full max-w-4xl gap-3 sm:grid-cols-3">
            <FeatureCard
              icon={<Printer size={18} />}
              title="Print Bank Details on Invoices"
              body="Print account details on invoices and get payments via NEFT/RTGS/IMPS."
            />
            <FeatureCard
              icon={<CreditCard size={18} />}
              title="Unlimited Payment Types"
              body="Record transactions by methods like Banks, UPI, Net Banking and Cards."
            />
            <FeatureCard
              icon={<QrCode size={18} />}
              title="Print UPI QR Code on Invoices"
              body="Print QR code on your invoices or send payment links to your customers."
            />
          </div>

          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add Bank Account
          </Button>
        </div>

        {formOpen && (
          <BankAccountModal
            key={editing?.id ?? 'new'}
            open
            onClose={() => setFormOpen(false)}
            account={editing}
            onSaved={(a) => setSelectedId(a.id)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line bg-white px-5 py-3">
        <h1 className="text-lg font-semibold text-ink">Banks</h1>
        <Button
          icon={<Plus size={16} />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Add Bank Account
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="min-h-0 overflow-y-auto border-r border-line bg-white p-3">
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              className={`mb-2 flex w-full flex-col rounded-lg border px-3.5 py-3 text-left transition ${
                selectedId === a.id
                  ? 'border-accent bg-accent-soft'
                  : 'border-line hover:border-line-strong'
              }`}
            >
              <span className="text-[14px] font-medium text-ink">{a.accountName}</span>
              {a.bankName && <span className="text-[12px] text-ink-faint">{a.bankName}</span>}
              <span
                className={`mt-1.5 text-[15px] font-semibold ${
                  num(a.balance) < 0 ? 'text-danger' : 'text-success'
                }`}
              >
                {formatCurrency(a.balance)}
              </span>
            </button>
          ))}
        </div>

        <div className="min-h-0 overflow-y-auto bg-canvas p-4">
          {selected && (
            <>
              <Card className="mb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[16px] font-semibold text-ink">{selected.accountName}</h2>
                    <div className="mt-2 grid gap-x-8 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
                      {selected.bankName && <Detail label="Bank" value={selected.bankName} />}
                      {selected.accountNumber && (
                        <Detail label="A/C No." value={selected.accountNumber} />
                      )}
                      {selected.ifscCode && <Detail label="IFSC" value={selected.ifscCode} />}
                      {selected.upiId && <Detail label="UPI" value={selected.upiId} />}
                      <Detail
                        label="Opening Balance"
                        value={formatCurrency(selected.openingBalance)}
                      />
                      {selected.asOfDate && (
                        <Detail label="As of" value={formatDate(selected.asOfDate)} />
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[12px] text-ink-faint">Current Balance</p>
                    <p
                      className={`text-2xl font-semibold ${
                        num(selected.balance) < 0 ? 'text-danger' : 'text-success'
                      }`}
                    >
                      {formatCurrency(selected.balance)}
                    </p>
                    <div className="mt-2 flex justify-end">
                      <Menu
                        trigger={
                          <span className="rounded-full p-1.5 text-ink-soft transition hover:bg-canvas">
                            <MoreVertical size={17} />
                          </span>
                        }
                        items={[
                          {
                            label: 'Edit Account',
                            icon: <Pencil size={14} />,
                            onClick: () => {
                              setEditing(selected);
                              setFormOpen(true);
                            },
                          },
                          {
                            label: 'Delete Account',
                            danger: true,
                            icon: <Trash2 size={14} />,
                            onClick: () => setConfirmDelete(selected),
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <div className="card overflow-hidden">
                <div className="border-b border-line px-4 py-3">
                  <h3 className="text-[14.5px] font-semibold uppercase text-ink">Transactions</h3>
                </div>
                {detail?.statement?.length ? (
                  <DataTable
                    columns={statementColumns}
                    rows={detail.statement}
                    rowKey={(r) => r.id}
                    onRowClick={(r) => router.push(`/txn/${r.id}`)}
                    dense
                  />
                ) : (
                  <div className="px-4 py-14 text-center text-[13px] text-ink-faint">
                    No transactions on this account yet.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {formOpen && (
        <BankAccountModal
          key={editing?.id ?? 'new'}
          open
          onClose={() => setFormOpen(false)}
          account={editing}
          onSaved={(a) => setSelectedId(a.id)}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete bank account"
        message={`Delete ${confirmDelete?.accountName}? Transactions linked to it will lose the account reference.`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        loading={deleting}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-ink-soft">
      {label}: <span className="font-medium text-ink">{value}</span>
    </p>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
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

function BankAccountModal({
  open,
  onClose,
  account,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  account: BankAccount | null;
  onSaved?: (a: BankAccount) => void;
}) {
  const dispatch = useAppDispatch();
  const [addAccount, { isLoading: adding }] = useAddBankAccountMutation();
  const [updateAccount, { isLoading: updating }] = useUpdateBankAccountMutation();

  const [draft, setDraft] = useState(() => ({
    accountName: account?.accountName ?? '',
    bankName: account?.bankName ?? '',
    accountNumber: account?.accountNumber ?? '',
    ifscCode: account?.ifscCode ?? '',
    upiId: account?.upiId ?? '',
    accountHolderName: account?.accountHolderName ?? '',
    openingBalance: account?.openingBalance ?? '',
    asOfDate: account?.asOfDate ?? toISODate(),
    printUpiQr: account?.printUpiQr ?? false,
    printBankDetails: account?.printBankDetails ?? false,
  }));
  const [error, setError] = useState('');

  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    if (!draft.accountName.trim()) {
      setError('Account display name is required');
      return;
    }
    const payload = { ...draft, openingBalance: num(draft.openingBalance) };
    try {
      const saved = account
        ? await updateAccount({ ...payload, id: account.id }).unwrap()
        : await addAccount(payload).unwrap();
      dispatch(pushToast(account ? 'Account updated' : 'Bank account added', 'success'));
      onSaved?.(saved);
      onClose();
    } catch {
      dispatch(pushToast('Could not save this account', 'error'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={account ? 'Edit Bank Account' : 'Add Bank Account'}
      width="md"
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account Display Name" required error={error} className="sm:col-span-2">
          <Input
            value={draft.accountName}
            onChange={(e) => set({ accountName: e.target.value })}
            placeholder="e.g. HDFC Current"
            autoFocus
          />
        </Field>
        <Field label="Opening Balance">
          <Input
            type="number"
            value={draft.openingBalance}
            onChange={(e) => set({ openingBalance: e.target.value })}
            placeholder="0.00"
          />
        </Field>
        <Field label="As of Date">
          <Input
            type="date"
            value={draft.asOfDate}
            onChange={(e) => set({ asOfDate: e.target.value })}
          />
        </Field>
        <Field label="Bank Name">
          <Input value={draft.bankName} onChange={(e) => set({ bankName: e.target.value })} />
        </Field>
        <Field label="Account Holder Name">
          <Input
            value={draft.accountHolderName}
            onChange={(e) => set({ accountHolderName: e.target.value })}
          />
        </Field>
        <Field label="Account Number">
          <Input
            value={draft.accountNumber}
            onChange={(e) => set({ accountNumber: e.target.value })}
          />
        </Field>
        <Field label="IFSC Code">
          <Input
            value={draft.ifscCode}
            onChange={(e) => set({ ifscCode: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="UPI ID for QR Code" className="sm:col-span-2">
          <Input
            value={draft.upiId}
            onChange={(e) => set({ upiId: e.target.value })}
            placeholder="name@bank"
          />
        </Field>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Checkbox
            checked={draft.printBankDetails}
            onChange={(v) => set({ printBankDetails: v })}
            label="Print bank details on invoices"
          />
          <Checkbox
            checked={draft.printUpiQr}
            onChange={(v) => set({ printUpiQr: v })}
            label="Print UPI QR code on invoices"
          />
        </div>
      </div>
    </Modal>
  );
}
