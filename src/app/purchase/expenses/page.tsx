'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Receipt, Trash2, MoreVertical } from 'lucide-react';
import {
  useGetExpenseCategoriesQuery,
  useAddExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  useGetTransactionsQuery,
} from '@/store/api';
import {
  Button,
  Spinner,
  EmptyState,
  Tabs,
  Modal,
  Field,
  Input,
  Select,
  Menu,
  SearchInput,
} from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { DateRangeFilter, useDateRange } from '@/components/ui/DateRangeFilter';
import { formatCurrency, formatDate, num } from '@/lib/format';
import { useSelection } from '@/lib/useSelection';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';
import type { ExpenseCategoryRow, TransactionRow } from '@/types';

const TABS = [
  { id: 'category', label: 'Category' },
  { id: 'items', label: 'Items' },
];

export default function ExpensesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [tab, setTab] = useState('category');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'direct' | 'indirect'>('indirect');

  const { from, to } = useDateRange('expenses');
  const { data: categories = [], isLoading } = useGetExpenseCategoriesQuery();
  const { data: txnData, isLoading: txnLoading } = useGetTransactionsQuery({
    types: 'expense',
    from,
    to,
  });
  const [addCategory, { isLoading: adding }] = useAddExpenseCategoryMutation();
  const [deleteCategory] = useDeleteExpenseCategoryMutation();
  const [selectedId, setSelectedId] = useSelection(categories, (c) => c.id);

  const selected = useMemo(
    () => categories.find((c) => c.id === selectedId) ?? null,
    [categories, selectedId],
  );

  const allExpenses = useMemo(() => txnData?.transactions ?? [], [txnData]);
  const categoryExpenses = useMemo(
    () => allExpenses.filter((t) => t.expenseCategoryId === selectedId),
    [allExpenses, selectedId],
  );

  const filteredCategories = useMemo(
    () =>
      search
        ? categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
        : categories,
    [categories, search],
  );

  const saveCategory = async () => {
    if (!newName.trim()) return;
    await addCategory({ name: newName.trim(), type: newType }).unwrap();
    dispatch(pushToast(`Expense category "${newName}" added`, 'success'));
    setNewName('');
    setAddOpen(false);
  };

  const categoryColumns: Array<Column<ExpenseCategoryRow>> = [
    {
      key: 'name',
      header: 'Category',
      filterable: true,
      render: (c) => (
        <div>
          <span className="font-medium text-ink">{c.name}</span>
          <div className="text-[11.5px] capitalize text-ink-faint">{c.type} expense</div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Amount',
      align: 'right',
      value: (c) => c.total,
      render: (c) => (
        <span className={c.total > 0 ? 'font-medium text-ink' : 'text-ink-faint'}>
          {formatCurrency(c.total, { symbol: false })}
        </span>
      ),
    },
    {
      key: 'menu',
      header: '',
      sortable: false,
      width: '40px',
      render: (c) => (
        <Menu
          trigger={<MoreVertical size={15} className="text-ink-faint" />}
          items={[
            {
              label: 'Add Expense',
              onClick: () => router.push('/txn/new/expense'),
            },
            {
              label: 'Delete Category',
              danger: true,
              icon: <Trash2 size={14} />,
              onClick: async () => {
                await deleteCategory(c.id);
                dispatch(pushToast(`Category "${c.name}" removed`));
                if (selectedId === c.id) setSelectedId(null);
              },
            },
          ]}
        />
      ),
    },
  ];

  const expenseColumns: Array<Column<TransactionRow>> = [
    {
      key: 'txnDate',
      header: 'Date',
      filterable: true,
      value: (t) => t.txnDate,
      render: (t) => formatDate(t.txnDate),
    },
    { key: 'txnNo', header: 'Exp No.', filterable: true, value: (t) => t.txnNo },
    { key: 'partyName', header: 'Party', filterable: true, value: (t) => t.partyName ?? '—' },
    { key: 'paymentType', header: 'Payment Type', filterable: true },
    {
      key: 'totalAmount',
      header: 'Amount',
      align: 'right',
      value: (t) => num(t.totalAmount),
      render: (t) => formatCurrency(t.totalAmount),
    },
    {
      key: 'balanceAmount',
      header: 'Balance',
      align: 'right',
      value: (t) => num(t.balanceAmount),
      render: (t) => formatCurrency(t.balanceAmount),
    },
    {
      key: 'status',
      header: 'Status',
      filterable: true,
      render: (t) => <StatusPill status={t.status} dueDate={t.dueDate} />,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <DateRangeFilter scope="expenses" />

      {tab === 'items' ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="text-[14.5px] font-semibold text-ink">All Expenses</h3>
              <Button
                size="sm"
                icon={<Plus size={15} />}
                onClick={() => router.push('/txn/new/expense')}
              >
                Add Expense
              </Button>
            </div>
            {txnLoading ? (
              <Spinner />
            ) : allExpenses.length ? (
              <DataTable
                columns={expenseColumns}
                rows={allExpenses}
                rowKey={(t) => t.id}
                onRowClick={(t) => router.push(`/txn/${t.id}`)}
                dense
                footer={
                  <span className="text-[13px] font-medium text-ink">
                    Total: {formatCurrency(txnData?.summary.total ?? 0)}
                  </span>
                }
              />
            ) : (
              <EmptyState
                icon={<Receipt size={28} />}
                title="No expenses recorded"
                description="Track rent, salary, transport and other business costs here."
                action={
                  <Button onClick={() => router.push('/txn/new/expense')}>Add Expense</Button>
                }
              />
            )}
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Categories */}
          <div className="flex min-h-0 flex-col border-r border-line bg-white">
            <div className="flex items-center gap-2 p-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search category"
                className="flex-1"
              />
              <Button
                size="sm"
                icon={<Plus size={15} />}
                onClick={() => router.push('/txn/new/expense')}
              >
                Add Expense
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <Spinner />
              ) : (
                <DataTable
                  columns={categoryColumns}
                  rows={filteredCategories}
                  rowKey={(c) => c.id}
                  onRowClick={(c) => setSelectedId(c.id)}
                  selectedKey={selectedId}
                  dense
                />
              )}
            </div>

            <div className="border-t border-line p-3">
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus size={14} />}
                className="w-full"
                onClick={() => setAddOpen(true)}
              >
                New Expense Category
              </Button>
            </div>
          </div>

          {/* Category detail */}
          <div className="min-h-0 overflow-y-auto bg-canvas">
            {!selected ? (
              <EmptyState
                icon={<Receipt size={28} />}
                title="No categories"
                description="Create an expense category to start grouping costs."
                action={<Button onClick={() => setAddOpen(true)}>New Category</Button>}
              />
            ) : (
              <>
                <div className="m-4 mb-0 card flex flex-wrap items-start justify-between gap-4 p-4">
                  <div>
                    <h2 className="text-[16px] font-semibold uppercase text-ink">
                      {selected.name}
                    </h2>
                    <p className="mt-0.5 text-[12.5px] capitalize text-ink-soft">
                      {selected.type} Expense
                    </p>
                  </div>
                  <div className="flex gap-8 text-right">
                    <div>
                      <p className="text-[12px] text-ink-faint">Total</p>
                      <p className="mt-0.5 text-[15px] font-semibold text-ink">
                        {formatCurrency(selected.total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-ink-faint">Balance</p>
                      <p className="mt-0.5 text-[15px] font-semibold text-danger">
                        {formatCurrency(selected.balance)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="m-4 card overflow-hidden">
                  {txnLoading ? (
                    <Spinner />
                  ) : categoryExpenses.length ? (
                    <DataTable
                      columns={expenseColumns}
                      rows={categoryExpenses}
                      rowKey={(t) => t.id}
                      onRowClick={(t) => router.push(`/txn/${t.id}`)}
                      dense
                    />
                  ) : (
                    <div className="px-4 py-14 text-center text-[13px] text-ink-faint">
                      No transactions to show
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New Expense Category"
        width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCategory} loading={adding}>
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Category Name" required>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Electricity"
              autoFocus
            />
          </Field>
          <Field label="Type" hint="Direct costs sit above gross profit in the P&L.">
            <Select
              value={newType}
              onChange={(e) => setNewType(e.target.value as 'direct' | 'indirect')}
            >
              <option value="indirect">Indirect Expense</option>
              <option value="direct">Direct Expense</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
