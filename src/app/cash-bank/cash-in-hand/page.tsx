'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wallet, SlidersHorizontal } from 'lucide-react';
import { useGetCashQuery, useAddCashAdjustmentMutation } from '@/store/api';
import { Button, Spinner, Modal, Field, Input, Toggle, Textarea } from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { formatCurrency, formatDate, toISODate, num } from '@/lib/format';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';
import type { CashPayload } from '@/types';

type Entry = CashPayload['entries'][number];

export default function CashInHandPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CashScreen />
    </Suspense>
  );
}

function CashScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isLoading } = useGetCashQuery();
  // ?adjust=1 opens the adjustment dialog on arrival.
  const [adjustOpen, setAdjustOpen] = useState(() => searchParams.get('adjust') !== null);

  const columns: Array<Column<Entry>> = [
    { key: 'type', header: 'Type', filterable: true },
    { key: 'name', header: 'Name', filterable: true },
    {
      key: 'date',
      header: 'Date',
      filterable: true,
      value: (e) => e.date,
      render: (e) => formatDate(e.date),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      value: (e) => e.amount,
      render: (e) => (
        <span className={e.amount < 0 ? 'font-medium text-danger' : 'font-medium text-success'}>
          {formatCurrency(Math.abs(e.amount))}
        </span>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-5 py-3">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Wallet size={19} className="text-accent" />
          Cash In Hand
        </h1>
        <span
          className={`text-lg font-semibold ${
            num(data?.balance) < 0 ? 'text-danger' : 'text-success'
          }`}
        >
          {formatCurrency(data?.balance ?? 0)}
        </span>
        <Button
          className="ml-auto"
          icon={<SlidersHorizontal size={15} />}
          onClick={() => setAdjustOpen(true)}
        >
          Adjust Cash
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="card overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-[14.5px] font-semibold text-ink">Transactions</h2>
          </div>
          {isLoading ? (
            <Spinner />
          ) : data?.entries.length ? (
            <DataTable
              columns={columns}
              rows={data.entries}
              rowKey={(e) => e.id}
              onRowClick={(e) => e.txnId && router.push(`/txn/${e.txnId}`)}
              dense
            />
          ) : (
            <div className="px-4 py-16 text-center text-[13px] text-ink-faint">
              No cash movements yet. Cash-settled invoices, payments and expenses appear here.
            </div>
          )}
        </div>
      </div>

      {adjustOpen && (
        <AdjustCashModal
          open
          onClose={() => {
            setAdjustOpen(false);
            if (searchParams.get('adjust') !== null) router.replace('/cash-bank/cash-in-hand');
          }}
        />
      )}
    </div>
  );
}

function AdjustCashModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [addAdjustment, { isLoading }] = useAddCashAdjustmentMutation();

  const [reduce, setReduce] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    if (num(amount) <= 0) {
      setError('Enter an amount greater than zero');
      return;
    }
    await addAdjustment({
      type: reduce ? 'reduce' : 'add',
      amount: num(amount),
      adjustmentDate: date,
      description: description || undefined,
    }).unwrap();
    dispatch(pushToast(`Cash ${reduce ? 'reduced' : 'added'}`, 'success'));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="md"
      title={
        <span className="flex items-center gap-6">
          Adjust Cash
          <Toggle checked={reduce} onChange={setReduce} labelOff="Add Cash" labelOn="Reduce Cash" />
        </span>
      }
      footer={
        <Button onClick={save} loading={isLoading} variant="accent">
          Save
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount" required error={error}>
          <Input
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError('');
            }}
            placeholder="0.00"
            autoFocus
          />
        </Field>
        <Field label="Adjustment Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Reason for the adjustment"
          />
        </Field>
      </div>
    </Modal>
  );
}
