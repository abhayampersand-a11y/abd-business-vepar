'use client';

import { useState } from 'react';
import { Modal, Button, Field, Input, Toggle } from '@/components/ui';
import { useAddStockAdjustmentMutation } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';
import { toISODate, num } from '@/lib/format';
import type { ItemRow } from '@/types';

/** Mirrors Vyapar's "Stock Adjustment" dialog: add or reduce stock by hand. */
export function StockAdjustModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: ItemRow | null;
}) {
  const dispatch = useAppDispatch();
  const [addAdjustment, { isLoading }] = useAddStockAdjustmentMutation();

  const [reduce, setReduce] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [atPrice, setAtPrice] = useState(() => item?.purchasePrice ?? '');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(toISODate);
  const [error, setError] = useState('');

  const save = async () => {
    if (!item) return;
    const qty = num(quantity);
    if (qty <= 0) {
      setError('Enter a quantity greater than zero');
      return;
    }
    if (reduce && qty > num(item.stockQty)) {
      setError(`Only ${num(item.stockQty)} in stock — cannot reduce by ${qty}`);
      return;
    }

    try {
      await addAdjustment({
        itemId: item.id,
        type: reduce ? 'reduce' : 'add',
        quantity: qty,
        atPrice: num(atPrice),
        adjustmentDate: date,
        details: details || undefined,
      }).unwrap();
      dispatch(pushToast(`Stock ${reduce ? 'reduced' : 'added'} for ${item.name}`, 'success'));
      onClose();
    } catch (err) {
      dispatch(
        pushToast(
          (err as { data?: { error?: string } })?.data?.error ?? 'Could not adjust stock',
          'error',
        ),
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="md"
      title={
        <span className="flex items-center gap-6">
          Stock Adjustment
          <Toggle checked={reduce} onChange={setReduce} labelOff="Add Stock" labelOn="Reduce Stock" />
        </span>
      }
      footer={
        <Button onClick={save} loading={isLoading} variant="accent">
          Save
        </Button>
      }
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[12px] text-ink-faint">Item Name</p>
          <p className="mt-0.5 text-[14px] font-semibold text-ink">{item?.name}</p>
          <p className="mt-1 text-[12px] text-ink-soft">
            In stock: {num(item?.stockQty)} {item?.unitShort}
          </p>
        </div>
        <Field label="Adjustment Date" className="w-48">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Field label="Total Qty" required error={error}>
          <div className="flex gap-1.5">
            <Input
              type="number"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setError('');
              }}
              placeholder="0"
              autoFocus
            />
            <span className="flex h-9.5 shrink-0 items-center rounded-lg border border-line-strong bg-canvas px-3 text-[13px] text-ink-soft">
              {item?.unitShort ?? 'Pcs'}
            </span>
          </div>
        </Field>
        <Field label="At Price">
          <Input
            type="number"
            value={atPrice}
            onChange={(e) => setAtPrice(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label="Details">
          <Input
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Reason for adjustment"
          />
        </Field>
      </div>
    </Modal>
  );
}
