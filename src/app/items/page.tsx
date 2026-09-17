'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  MoreVertical,
  Search,
  SlidersHorizontal,
  Package,
  Trash2,
  Pencil,
  ChevronDown,
  FileSpreadsheet,
  QrCode as QrIcon,
  ScanLine,
} from 'lucide-react';
import {
  useGetItemsQuery,
  useGetItemQuery,
  useDeleteItemMutation,
  useUpdateItemMutation,
  useGetItemCategoriesQuery,
  useGetUnitsQuery,
  useAddUnitMutation,
  useAddItemCategoryMutation,
  useDeleteItemCategoryMutation,
} from '@/store/api';
import {
  Button,
  SearchInput,
  Spinner,
  EmptyState,
  Menu,
  Tabs,
  ConfirmDialog,
  Input,
  Field,
  Modal,
} from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { ItemFormModal } from '@/components/items/ItemFormModal';
import { StockAdjustModal } from '@/components/items/StockAdjustModal';
import { QrCode } from '@/components/items/QrCode';
import { ItemQrModal } from '@/components/items/ItemQrModal';
import { CameraScanModal } from '@/components/items/CameraScanModal';
import { codeFromScan, itemQrUrl } from '@/lib/item-code';
import { formatCurrency, formatDate, formatQty, num } from '@/lib/format';
import { useSelection } from '@/lib/useSelection';
import { TXN_META } from '@/lib/constants';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';
import type { ItemRow, Item } from '@/types';

const TABS = [
  { id: 'products', label: 'Products' },
  { id: 'services', label: 'Services' },
  { id: 'category', label: 'Category' },
  { id: 'units', label: 'Units' },
];

export default function ItemsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ItemsScreen />
    </Suspense>
  );
}

function ItemsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const [tab, setTab] = useState('products');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  // /items?new=1 opens the add form on arrival — read straight from the URL.
  const [formOpen, setFormOpen] = useState(() => searchParams.get('new') !== null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ItemRow | null>(null);
  const [qrItem, setQrItem] = useState<Item | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const itemType = tab === 'services' ? 'service' : 'product';
  const listActive = tab === 'products' || tab === 'services';

  const { data: items = [], isLoading } = useGetItemsQuery(
    { type: itemType, search: search || undefined },
    { skip: !listActive },
  );
  const [selectedId, setSelectedId] = useSelection(items, (i) => i.id);
  const { data: detail } = useGetItemQuery(selectedId!, { skip: !selectedId });
  const [deleteItem, { isLoading: deleting }] = useDeleteItemMutation();
  const [updateItem] = useUpdateItemMutation();

  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);

  const listColumns: Array<Column<ItemRow>> = [
    {
      key: 'name',
      header: 'Item',
      filterable: true,
      render: (i) => (
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-ink">{i.name}</span>
        </div>
      ),
    },
    {
      key: 'stockQty',
      header: 'Quantity',
      align: 'right',
      value: (i) => num(i.stockQty),
      render: (i) => {
        if (i.type === 'service') return <span className="text-ink-faint">—</span>;
        const qty = num(i.stockQty);
        const low = num(i.minStockLevel) > 0 && qty <= num(i.minStockLevel);
        return (
          <span
            className={
              qty < 0
                ? 'font-medium text-danger'
                : low
                  ? 'font-medium text-warning'
                  : 'font-medium text-success'
            }
          >
            {formatQty(qty)}
          </span>
        );
      },
    },
    {
      key: 'menu',
      header: '',
      sortable: false,
      width: '40px',
      render: (i) => (
        <Menu
          trigger={<MoreVertical size={15} className="text-ink-faint" />}
          items={[
            {
              label: 'Edit Item',
              icon: <Pencil size={14} />,
              onClick: () => {
                setEditing(i);
                setFormOpen(true);
              },
            },
            {
              label: 'QR Code & Labels',
              icon: <QrIcon size={14} />,
              onClick: () => setQrItem(i),
            },
            ...(i.type === 'product'
              ? [
                  {
                    label: 'Adjust Stock',
                    icon: <SlidersHorizontal size={14} />,
                    onClick: () => {
                      setSelectedId(i.id);
                      setAdjustOpen(true);
                    },
                  },
                ]
              : []),
            {
              label: i.isActive ? 'Mark Inactive' : 'Mark Active',
              onClick: async () => {
                await updateItem({ ...i, id: i.id, isActive: !i.isActive });
                dispatch(pushToast(`${i.name} marked ${i.isActive ? 'inactive' : 'active'}`));
              },
            },
            {
              label: 'Delete',
              danger: true,
              icon: <Trash2 size={14} />,
              onClick: () => setConfirmDelete(i),
            },
          ]}
        />
      ),
    },
  ];

  const txnColumns: Array<Column<NonNullable<typeof detail>['transactions'][number]>> = [
    {
      key: 'txnType',
      header: 'Type',
      filterable: true,
      value: (t) => TXN_META[t.txnType].label,
      render: (t) => (
        <span className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              background:
                TXN_META[t.txnType].affectsStock === 'in'
                  ? 'var(--color-warning)'
                  : 'var(--color-success)',
            }}
          />
          {TXN_META[t.txnType].label}
        </span>
      ),
    },
    { key: 'txnNo', header: 'Invoice/Ref.', filterable: true, value: (t) => t.txnNo },
    { key: 'partyName', header: 'Name', filterable: true, value: (t) => t.partyName ?? '' },
    {
      key: 'txnDate',
      header: 'Date',
      filterable: true,
      value: (t) => t.txnDate,
      render: (t) => formatDate(t.txnDate),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      value: (t) => num(t.quantity),
      render: (t) => `${formatQty(t.quantity)} ${t.unit ?? ''}`,
    },
    {
      key: 'pricePerUnit',
      header: 'Price/ Unit',
      align: 'right',
      value: (t) => num(t.pricePerUnit),
      render: (t) => formatCurrency(t.pricePerUnit),
    },
    {
      key: 'status',
      header: 'Status',
      filterable: true,
      render: (t) => <StatusPill status={t.status} />,
    },
  ];

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteItem(confirmDelete.id).unwrap();
      dispatch(pushToast(`${confirmDelete.name} deleted`, 'success'));
      setConfirmDelete(null);
    } catch (err) {
      dispatch(
        pushToast(
          (err as { data?: { error?: string } })?.data?.error ?? 'Could not delete this item',
          'error',
        ),
      );
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'category' ? (
        <CategoryTab />
      ) : tab === 'units' ? (
        <UnitsTab />
      ) : (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Item list */}
          <div className="flex min-h-0 flex-col border-r border-line bg-white">
            <div className="flex items-center gap-2 p-3">
              {showSearch ? (
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search items"
                  className="flex-1"
                />
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink-soft transition hover:text-ink"
                  aria-label="Search items"
                >
                  <Search size={16} />
                </button>
              )}
              <button
                onClick={() => setScanOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink-soft transition hover:text-ink"
                aria-label="Scan an item's QR code"
                title="Scan QR code"
              >
                <ScanLine size={16} />
              </button>

              <div className="ml-auto flex items-center">
                <Button
                  variant="gold"
                  size="sm"
                  icon={<Plus size={15} />}
                  className="rounded-r-none pr-3"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  {tab === 'services' ? 'Add Service' : 'Add Item'}
                </Button>
                <Menu
                  trigger={
                    <span className="flex h-8 items-center rounded-r-full bg-gold pl-1 pr-2.5 text-white">
                      <ChevronDown size={15} />
                    </span>
                  }
                  items={[
                    {
                      label: 'Import Items',
                      icon: <FileSpreadsheet size={14} />,
                      onClick: () => router.push('/utilities/import-items'),
                    },
                  ]}
                />
              </div>

              <Menu
                trigger={
                  <span className="rounded-full p-1.5 text-ink-soft transition hover:bg-canvas">
                    <MoreVertical size={16} />
                  </span>
                }
                items={[
                  {
                    label: 'Bulk Inactive',
                    onClick: () => dispatch(pushToast('Select items to deactivate', 'info')),
                  },
                  {
                    label: 'Bulk Active',
                    onClick: () => dispatch(pushToast('Select items to activate', 'info')),
                  },
                  { label: 'Assign Units', onClick: () => setTab('units') },
                  { label: 'Bulk Update Items', onClick: () => router.push('/utilities/bulk-update') },
                  { label: 'Export Items', onClick: () => router.push('/utilities/export-items') },
                  { label: 'Print QR Labels', onClick: () => router.push('/utilities/barcode') },
                ]}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <Spinner />
              ) : items.length ? (
                <DataTable
                  columns={listColumns}
                  rows={items}
                  rowKey={(i) => i.id}
                  onRowClick={(i) => setSelectedId(i.id)}
                  selectedKey={selectedId}
                  dense
                />
              ) : (
                <EmptyState
                  icon={<Package size={28} />}
                  title={tab === 'services' ? 'No services yet' : 'No items yet'}
                  description="Add what you sell so you can bill it and track stock."
                  action={
                    <Button
                      icon={<Plus size={15} />}
                      onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                      }}
                    >
                      {tab === 'services' ? 'Add Service' : 'Add Item'}
                    </Button>
                  }
                />
              )}
            </div>
          </div>

          {/* Item detail */}
          <div className="min-h-0 overflow-y-auto bg-canvas">
            {!selected ? (
              <EmptyState
                icon={<Package size={28} />}
                title="Select an item"
                description="Pick an item to see its price, stock and transactions."
              />
            ) : (
              <>
                <div className="m-4 mb-0 card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[16px] font-semibold uppercase text-ink">
                        {selected.name}
                      </h2>
                      {selected.itemCode && (
                        <p className="mt-0.5 font-mono text-[12.5px] text-ink-soft">
                          {selected.itemCode}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-6">
                        <Stat
                          label="Sale Price"
                          value={`${formatCurrency(selected.salePrice)} ${
                            selected.salePriceTaxInclusive ? '(incl)' : '(excl)'
                          }`}
                          tone="success"
                        />
                        <Stat
                          label="Purchase Price"
                          value={`${formatCurrency(selected.purchasePrice)} ${
                            selected.purchasePriceTaxInclusive ? '(incl)' : '(excl)'
                          }`}
                          tone="success"
                        />
                        {selected.type === 'product' && (
                          <>
                            <Stat label="Stock Quantity" value={formatQty(selected.stockQty)} />
                            <Stat
                              label="Stock Value"
                              value={formatCurrency(
                                num(selected.stockQty) * num(selected.purchasePrice),
                              )}
                            />
                          </>
                        )}
                        {selected.hsnSac && <Stat label="HSN/SAC" value={selected.hsnSac} />}
                        <Stat label="GST" value={`${num(selected.taxRate)}%`} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selected.itemCode && (
                        <button
                          onClick={() => setQrItem(selected)}
                          className="rounded-lg border border-line bg-white p-1 transition hover:border-accent"
                          aria-label="Show QR code and print labels"
                          title="QR code & labels"
                        >
                          <QrCode value={itemQrUrl(selected.itemCode)} size={64} />
                        </button>
                      )}
                      {selected.type === 'product' && (
                        <Button
                          variant="accent"
                          size="sm"
                          icon={<SlidersHorizontal size={15} />}
                          onClick={() => setAdjustOpen(true)}
                        >
                          ADJUST ITEM
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Pencil size={14} />}
                        onClick={() => {
                          setEditing(selected);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="m-4 card overflow-hidden">
                  <div className="border-b border-line px-4 py-3">
                    <h3 className="text-[14.5px] font-semibold uppercase text-ink">Transactions</h3>
                  </div>
                  {detail?.transactions?.length ? (
                    <DataTable
                      columns={txnColumns}
                      rows={detail.transactions}
                      rowKey={(t) => `${t.txnId}-${t.txnNo}`}
                      onRowClick={(t) => router.push(`/txn/${t.txnId}`)}
                      dense
                    />
                  ) : (
                    <EmptyState
                      icon={<Package size={26} />}
                      title="No transactions"
                      description={`${selected.name} hasn't been bought or sold yet.`}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {formOpen && (
        <ItemFormModal
          key={editing?.id ?? `new-${itemType}`}
          open
          onClose={() => {
            setFormOpen(false);
            if (searchParams.get('new') !== null) router.replace('/items');
          }}
          item={editing}
          defaultType={itemType}
          onSaved={(i) => setSelectedId(i.id)}
        />
      )}

      {adjustOpen && selected && (
        <StockAdjustModal
          key={selected.id}
          open
          onClose={() => setAdjustOpen(false)}
          item={selected}
        />
      )}

      {qrItem && <ItemQrModal key={qrItem.id} item={qrItem} onClose={() => setQrItem(null)} />}

      {scanOpen && (
        <CameraScanModal
          onClose={() => setScanOpen(false)}
          onScan={(text) => {
            const code = codeFromScan(text);
            if (code) router.push(`/i/${encodeURIComponent(code)}`);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete item"
        message={`Delete ${confirmDelete?.name}? This cannot be undone.`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        loading={deleting}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div>
      <p className="text-[11.5px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p
        className={`mt-0.5 text-[14px] font-medium ${
          tone === 'success' ? 'text-success' : 'text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Category tab
 * ------------------------------------------------------------------ */

function CategoryTab() {
  const dispatch = useAppDispatch();
  const { data: categories = [], isLoading } = useGetItemCategoriesQuery();
  const [addCategory, { isLoading: adding }] = useAddItemCategoryMutation();
  const [deleteCategory] = useDeleteItemCategoryMutation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const save = async () => {
    if (!name.trim()) return;
    await addCategory({ name: name.trim() }).unwrap();
    dispatch(pushToast(`Category "${name}" added`, 'success'));
    setName('');
    setOpen(false);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-[14.5px] font-semibold text-ink">Item Categories</h3>
          <Button size="sm" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            Add Category
          </Button>
        </div>

        {isLoading ? (
          <Spinner />
        ) : categories.length ? (
          <DataTable
            columns={[
              { key: 'name', header: 'Category', filterable: true },
              { key: 'itemCount', header: 'Items', align: 'right' },
              {
                key: 'actions',
                header: '',
                sortable: false,
                width: '48px',
                render: (c: { id: number; name: string }) => (
                  <button
                    onClick={async () => {
                      await deleteCategory(c.id);
                      dispatch(pushToast(`Category "${c.name}" removed`));
                    }}
                    className="text-ink-faint transition hover:text-danger"
                    aria-label="Delete category"
                  >
                    <Trash2 size={15} />
                  </button>
                ),
              },
            ]}
            rows={categories}
            rowKey={(c) => c.id}
          />
        ) : (
          <EmptyState
            icon={<Package size={26} />}
            title="No categories"
            description="Group items into categories to report on them together."
            action={<Button onClick={() => setOpen(true)}>Add Category</Button>}
          />
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Category"
        width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={adding}>
              Save
            </Button>
          </>
        }
      >
        <Field label="Category Name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Electronics"
            autoFocus
          />
        </Field>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Units tab
 * ------------------------------------------------------------------ */

function UnitsTab() {
  const dispatch = useAppDispatch();
  const { data: units = [], isLoading } = useGetUnitsQuery();
  const [addUnit, { isLoading: adding }] = useAddUnitMutation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');

  const save = async () => {
    if (!name.trim() || !shortName.trim()) return;
    await addUnit({ name: name.trim(), shortName: shortName.trim() }).unwrap();
    dispatch(pushToast(`Unit "${name}" added`, 'success'));
    setName('');
    setShortName('');
    setOpen(false);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-[14.5px] font-semibold text-ink">Units of Measurement</h3>
          <Button size="sm" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            Add Unit
          </Button>
        </div>

        {isLoading ? (
          <Spinner />
        ) : (
          <DataTable
            columns={[
              { key: 'name', header: 'Unit Name', filterable: true },
              { key: 'shortName', header: 'Short Name' },
            ]}
            rows={units}
            rowKey={(u) => u.id}
          />
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Unit"
        width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={adding}>
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Unit Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kilograms"
              autoFocus
            />
          </Field>
          <Field label="Short Name" required>
            <Input
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g. Kg"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
