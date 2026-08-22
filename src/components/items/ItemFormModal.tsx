'use client';

import { useState } from 'react';
import { Modal, Button, Field, Input, Select, Textarea, Checkbox } from '@/components/ui';
import {
  useAddItemMutation,
  useUpdateItemMutation,
  useGetBootstrapQuery,
  useAddItemCategoryMutation,
} from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';
import { GST_RATES } from '@/lib/constants';
import { toISODate, num } from '@/lib/format';
import type { Item } from '@/types';

type Draft = {
  name: string;
  type: 'product' | 'service';
  itemCode: string;
  hsnSac: string;
  categoryId: string;
  unitId: string;
  description: string;
  salePrice: string;
  salePriceTaxInclusive: boolean;
  purchasePrice: string;
  purchasePriceTaxInclusive: boolean;
  taxRate: string;
  discountValue: string;
  openingStock: string;
  openingStockPrice: string;
  openingStockDate: string;
  minStockLevel: string;
  location: string;
};

const draftFromItem = (item: Item): Draft => ({
  name: item.name,
  type: item.type,
  itemCode: item.itemCode ?? '',
  hsnSac: item.hsnSac ?? '',
  categoryId: item.categoryId ? String(item.categoryId) : '',
  unitId: item.unitId ? String(item.unitId) : '',
  description: item.description ?? '',
  salePrice: item.salePrice ?? '',
  salePriceTaxInclusive: item.salePriceTaxInclusive,
  purchasePrice: item.purchasePrice ?? '',
  purchasePriceTaxInclusive: item.purchasePriceTaxInclusive,
  taxRate: item.taxRate ?? '0',
  discountValue: item.discountValue ?? '',
  openingStock: item.openingStock ?? '',
  openingStockPrice: item.openingStockPrice ?? '',
  openingStockDate: item.openingStockDate ?? toISODate(),
  minStockLevel: item.minStockLevel ?? '',
  location: item.location ?? '',
});

const emptyDraft = (type: 'product' | 'service' = 'product'): Draft => ({
  name: '',
  type,
  itemCode: '',
  hsnSac: '',
  categoryId: '',
  unitId: '',
  description: '',
  salePrice: '',
  salePriceTaxInclusive: false,
  purchasePrice: '',
  purchasePriceTaxInclusive: false,
  taxRate: '0',
  discountValue: '',
  openingStock: '',
  openingStockPrice: '',
  openingStockDate: toISODate(),
  minStockLevel: '',
  location: '',
});

export function ItemFormModal({
  open,
  onClose,
  item,
  defaultType = 'product',
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  item?: Item | null;
  defaultType?: 'product' | 'service';
  onSaved?: (item: Item) => void;
}) {
  const dispatch = useAppDispatch();
  const { data: bootstrap } = useGetBootstrapQuery();
  const [addItem, { isLoading: adding }] = useAddItemMutation();
  const [updateItem, { isLoading: updating }] = useUpdateItemMutation();
  const [addCategory] = useAddItemCategoryMutation();

  // Mounted fresh each time it opens (the caller keys it).
  const [draft, setDraft] = useState<Draft>(() =>
    item ? draftFromItem(item) : emptyDraft(defaultType),
  );
  const [tab, setTab] = useState<'pricing' | 'stock'>('pricing');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newCategory, setNewCategory] = useState('');

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    if (!draft.name.trim()) {
      setErrors({ name: 'Item name is required' });
      return;
    }

    const payload = {
      ...draft,
      categoryId: draft.categoryId ? Number(draft.categoryId) : null,
      unitId: draft.unitId ? Number(draft.unitId) : null,
      salePrice: num(draft.salePrice),
      purchasePrice: num(draft.purchasePrice),
      taxRate: num(draft.taxRate),
      discountValue: num(draft.discountValue),
      openingStock: num(draft.openingStock),
      openingStockPrice: num(draft.openingStockPrice),
      minStockLevel: num(draft.minStockLevel),
    };

    try {
      const saved = item
        ? await updateItem({ id: item.id, ...payload }).unwrap()
        : await addItem(payload).unwrap();
      dispatch(pushToast(item ? 'Item updated' : `${saved.name} added`, 'success'));
      onSaved?.(saved);
      onClose();
    } catch (err) {
      dispatch(
        pushToast(
          (err as { data?: { error?: string } })?.data?.error ?? 'Could not save this item',
          'error',
        ),
      );
    }
  };

  const createCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const cat = await addCategory({ name: newCategory.trim() }).unwrap();
      set('categoryId', String(cat.id));
      setNewCategory('');
      dispatch(pushToast(`Category "${cat.name}" created`, 'success'));
    } catch {
      dispatch(pushToast('Could not create that category', 'error'));
    }
  };

  const isService = draft.type === 'service';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'Edit Item' : isService ? 'Add Service' : 'Add Item'}
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
        <Field label="Item Name" required error={errors.name} className="sm:col-span-2">
          <Input
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Cotton T-Shirt"
            autoFocus
          />
        </Field>
        <Field label="Type">
          <Select
            value={draft.type}
            onChange={(e) => set('type', e.target.value as 'product' | 'service')}
            disabled={Boolean(item)}
          >
            <option value="product">Product</option>
            <option value="service">Service</option>
          </Select>
        </Field>

        <Field label="Item Code">
          <Input
            value={draft.itemCode}
            onChange={(e) => set('itemCode', e.target.value)}
            placeholder="SKU / barcode"
          />
        </Field>
        <Field label={isService ? 'SAC Code' : 'HSN Code'}>
          <Input value={draft.hsnSac} onChange={(e) => set('hsnSac', e.target.value)} />
        </Field>
        <Field label="Unit">
          <Select value={draft.unitId} onChange={(e) => set('unitId', e.target.value)}>
            <option value="">Select unit</option>
            {bootstrap?.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.shortName})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Category" className="sm:col-span-2">
          <Select value={draft.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">Uncategorised</option>
            {bootstrap?.itemCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="New Category">
          <div className="flex gap-1.5">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Add & select"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  createCategory();
                }
              }}
            />
            <Button variant="secondary" size="sm" onClick={createCategory} className="shrink-0">
              Add
            </Button>
          </div>
        </Field>
      </div>

      <div className="mt-5 flex gap-1 border-b border-line">
        {(
          [
            ['pricing', 'Pricing'],
            ['stock', isService ? 'Details' : 'Stock'],
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
        {tab === 'pricing' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sale Price">
              <div className="flex flex-col gap-2">
                <Input
                  type="number"
                  value={draft.salePrice}
                  onChange={(e) => set('salePrice', e.target.value)}
                  placeholder="0.00"
                />
                <Checkbox
                  checked={draft.salePriceTaxInclusive}
                  onChange={(v) => set('salePriceTaxInclusive', v)}
                  label="Tax included in price"
                />
              </div>
            </Field>

            <Field label="Purchase Price">
              <div className="flex flex-col gap-2">
                <Input
                  type="number"
                  value={draft.purchasePrice}
                  onChange={(e) => set('purchasePrice', e.target.value)}
                  placeholder="0.00"
                />
                <Checkbox
                  checked={draft.purchasePriceTaxInclusive}
                  onChange={(v) => set('purchasePriceTaxInclusive', v)}
                  label="Tax included in price"
                />
              </div>
            </Field>

            <Field label="GST Tax Rate">
              <Select value={draft.taxRate} onChange={(e) => set('taxRate', e.target.value)}>
                {GST_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r === 0 ? 'None (0%)' : `GST @ ${r}%`}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Default Discount (%)">
              <Input
                type="number"
                value={draft.discountValue}
                onChange={(e) => set('discountValue', e.target.value)}
                placeholder="0"
              />
            </Field>

            <Field label="Description" className="sm:col-span-2">
              <Textarea
                value={draft.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {isService ? (
              <p className="sm:col-span-2 rounded-lg bg-accent-soft px-4 py-3 text-[13px] text-ink-soft">
                Services do not carry stock, so no opening quantity is tracked.
              </p>
            ) : (
              <>
                <Field label="Opening Quantity">
                  <Input
                    type="number"
                    value={draft.openingStock}
                    onChange={(e) => set('openingStock', e.target.value)}
                    placeholder="0"
                  />
                </Field>
                <Field label="At Price" hint="Per-unit cost used to value the opening stock.">
                  <Input
                    type="number"
                    value={draft.openingStockPrice}
                    onChange={(e) => set('openingStockPrice', e.target.value)}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="As of Date">
                  <Input
                    type="date"
                    value={draft.openingStockDate}
                    onChange={(e) => set('openingStockDate', e.target.value)}
                  />
                </Field>
                <Field label="Min Stock to Maintain" hint="Triggers the low-stock alert.">
                  <Input
                    type="number"
                    value={draft.minStockLevel}
                    onChange={(e) => set('minStockLevel', e.target.value)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Item Location">
                  <Input
                    value={draft.location}
                    onChange={(e) => set('location', e.target.value)}
                    placeholder="Rack / shelf"
                  />
                </Field>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
