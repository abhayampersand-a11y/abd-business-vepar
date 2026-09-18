'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Pencil,
  MessageSquare,
  MoreVertical,
  Settings,
  Users,
  Contact,
  Trash2,
  FileText,
} from 'lucide-react';
import {
  useGetPartiesQuery,
  useGetPartyQuery,
  useDeletePartyMutation,
} from '@/store/api';
import {
  Button,
  SearchInput,
  Spinner,
  EmptyState,
  Menu,
  ConfirmDialog,
} from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { PartyFormModal } from '@/components/parties/PartyFormModal';
import { formatCurrency, formatDate, num } from '@/lib/format';
import { useSelection } from '@/lib/useSelection';
import { TXN_META } from '@/lib/constants';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';
import type { Party, Transaction } from '@/types';

/** Up to two initials for a party's avatar circle. */
function initials(name: string) {
  const parts = name.trim().split(/s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function PartiesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PartiesScreen />
    </Suspense>
  );
}

function PartiesScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const [search, setSearch] = useState('');
  // /parties?new=1 opens the add form on arrival — read straight from the URL.
  const [formOpen, setFormOpen] = useState(() => searchParams.get('new') !== null);
  const [editing, setEditing] = useState<Party | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Party | null>(null);

  const { data: parties = [], isLoading } = useGetPartiesQuery({ search: search || undefined });
  const [selectedId, setSelectedId] = useSelection(parties, (p) => p.id);
  const { data: detail, isFetching: detailLoading } = useGetPartyQuery(selectedId!, {
    skip: !selectedId,
  });
  const [deleteParty, { isLoading: deleting }] = useDeletePartyMutation();

  const listColumns: Array<Column<Party>> = [
    {
      key: 'name',
      header: 'Party Name',
      filterable: true,
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-soft text-[11.5px] font-semibold uppercase text-ink-soft"
          >
            {initials(p.name)}
          </span>
          <div className="min-w-0">
            <span className="block truncate font-medium text-ink">{p.name}</span>
            {p.phone && <span className="block text-[12px] text-ink-faint">{p.phone}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'balance',
      header: 'Amount',
      align: 'right',
      value: (p) => num(p.balance),
      render: (p) => {
        const b = num(p.balance);
        return (
          <span
            className={
              b > 0 ? 'font-medium text-success' : b < 0 ? 'font-medium text-danger' : 'text-ink-soft'
            }
          >
            {formatCurrency(Math.abs(b), { symbol: false })}
          </span>
        );
      },
    },
  ];

  const txnColumns: Array<Column<Transaction>> = [
    {
      key: 'txnType',
      header: 'Type',
      filterable: true,
      value: (t) => TXN_META[t.txnType].label,
      render: (t) => TXN_META[t.txnType].label,
    },
    { key: 'txnNo', header: 'Number', filterable: true, value: (t) => t.txnNo },
    {
      key: 'txnDate',
      header: 'Date',
      filterable: true,
      value: (t) => t.txnDate,
      render: (t) => formatDate(t.txnDate),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      align: 'right',
      value: (t) => num(t.totalAmount),
      render: (t) => formatCurrency(t.totalAmount),
    },
    {
      key: 'balanceAmount',
      header: 'Balance/ Unused',
      align: 'right',
      value: (t) => num(t.balanceAmount),
      render: (t) => formatCurrency(t.balanceAmount),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      filterable: true,
      value: (t) => t.dueDate ?? '',
      render: (t) => formatDate(t.dueDate),
    },
    {
      key: 'status',
      header: 'Status',
      filterable: true,
      render: (t) => <StatusPill status={t.status} dueDate={t.dueDate} />,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      width: '48px',
      render: (t) => (
        <Menu
          trigger={<MoreVertical size={16} className="text-ink-faint" />}
          items={[
            { label: 'View / Print', onClick: () => router.push(`/txn/${t.id}`) },
            { label: 'Edit', onClick: () => router.push(`/txn/${t.id}/edit`) },
          ]}
        />
      ),
    },
  ];

  const selected = useMemo(
    () => parties.find((p) => p.id === selectedId) ?? null,
    [parties, selectedId],
  );

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteParty(confirmDelete.id).unwrap();
      dispatch(pushToast(`${confirmDelete.name} deleted`, 'success'));
      setConfirmDelete(null);
      setSelectedId(null);
    } catch (err) {
      dispatch(
        pushToast(
          (err as { data?: { error?: string } })?.data?.error ?? 'Could not delete this party',
          'error',
        ),
      );
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/60 bg-white/45 backdrop-blur-sm px-5 py-3">
        <h1 className="text-lg font-semibold text-ink">Parties</h1>
        <div className="flex items-center gap-2">
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add Party
          </Button>
          <Link
            href="/settings"
            className="rounded-full p-2 text-ink-soft transition hover:bg-canvas"
          >
            <Settings size={17} />
          </Link>
          <Menu
            trigger={
              <span className="rounded-full p-2 text-ink-soft transition hover:bg-canvas">
                <MoreVertical size={17} />
              </span>
            }
            items={[
              { label: 'Import Parties', onClick: () => router.push('/utilities/import-parties') },
              { label: 'All Parties Report', onClick: () => router.push('/reports/all-parties') },
              {
                label: 'Party Statement',
                onClick: () =>
                  router.push(
                    `/reports/party-statement${selectedId ? `?partyId=${selectedId}` : ''}`,
                  ),
              },
            ]}
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Party list */}
        <div className="flex min-h-0 flex-col border-r border-white/60 bg-white/40">
          <div className="p-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search Party Name" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <Spinner />
            ) : parties.length ? (
              <DataTable
                columns={listColumns}
                rows={parties}
                rowKey={(p) => p.id}
                onRowClick={(p) => setSelectedId(p.id)}
                selectedKey={selectedId}
                dense
              />
            ) : (
              <EmptyState
                icon={<Users size={30} />}
                title="No parties yet"
                description="Add your first customer or supplier to start billing."
                action={
                  <Button
                    icon={<Plus size={16} />}
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    Add Party
                  </Button>
                }
              />
            )}
          </div>

          <Link
            href="/utilities/import-parties"
            className="m-3 flex items-center gap-3 rounded-lg bg-success-soft px-3 py-3 text-[12.5px] text-ink transition hover:brightness-98"
          >
            <Contact size={20} className="text-success" />
            <span className="flex-1">
              Use contacts from your Phone or Gmail to{' '}
              <span className="font-semibold">quickly create parties.</span>
            </span>
          </Link>
        </div>

        {/* Party detail */}
        <div className="flex min-h-0 flex-col overflow-y-auto">
          {!selected ? (
            <EmptyState
              icon={<Users size={30} />}
              title="Select a party"
              description="Pick a party on the left to see its transactions."
            />
          ) : (
            <>
              <div className="m-4 mb-0 card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[16px] font-semibold text-ink">{selected.name}</h2>
                      <button
                        onClick={() => {
                          setEditing(selected);
                          setFormOpen(true);
                        }}
                        className="text-accent transition hover:brightness-90"
                        aria-label="Edit party"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-6">
                      <DetailBit label="Phone Number" value={selected.phone || '—'} />
                      <DetailBit label="GSTIN" value={selected.gstin || '—'} />
                      <DetailBit
                        label={num(selected.balance) < 0 ? 'You Pay' : 'You Receive'}
                        value={formatCurrency(Math.abs(num(selected.balance)))}
                        tone={num(selected.balance) < 0 ? 'danger' : 'success'}
                      />
                      {selected.creditLimit && (
                        <DetailBit
                          label="Credit Limit"
                          value={formatCurrency(selected.creditLimit)}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {selected.phone && (
                      <a
                        href={`https://wa.me/91${selected.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full p-2 text-success transition hover:bg-success-soft"
                        aria-label="Send WhatsApp"
                      >
                        <MessageSquare size={17} />
                      </a>
                    )}
                    <Link
                      href={`/reports/party-statement?partyId=${selected.id}`}
                      className="rounded-full p-2 text-accent transition hover:bg-accent-soft"
                      aria-label="Party statement"
                    >
                      <FileText size={17} />
                    </Link>
                    <Menu
                      trigger={
                        <span className="rounded-full p-2 text-ink-soft transition hover:bg-canvas">
                          <MoreVertical size={17} />
                        </span>
                      }
                      items={[
                        {
                          label: 'Add Sale Invoice',
                          onClick: () => router.push(`/txn/new/sale?partyId=${selected.id}`),
                        },
                        {
                          label: 'Add Payment-In',
                          onClick: () => router.push(`/txn/new/payment_in?partyId=${selected.id}`),
                        },
                        {
                          label: 'Edit Party',
                          onClick: () => {
                            setEditing(selected);
                            setFormOpen(true);
                          },
                        },
                        {
                          label: 'Delete Party',
                          danger: true,
                          icon: <Trash2 size={14} />,
                          onClick: () => setConfirmDelete(selected),
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="m-4 card overflow-hidden" >
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <h3 className="text-[14.5px] font-semibold text-ink">Transactions</h3>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Plus size={14} />}
                    onClick={() => router.push(`/txn/new/sale?partyId=${selected.id}`)}
                  >
                    Add Sale
                  </Button>
                </div>

                {detailLoading && !detail ? (
                  <Spinner />
                ) : detail?.transactions?.length ? (
                  <DataTable
                    columns={txnColumns}
                    rows={detail.transactions}
                    rowKey={(t) => t.id}
                    onRowClick={(t) => router.push(`/txn/${t.id}`)}
                    dense
                  />
                ) : (
                  <EmptyState
                    icon={<FileText size={28} />}
                    title="No transactions yet"
                    description={`Nothing recorded against ${selected.name} so far.`}
                    action={
                      <Button
                        size="sm"
                        onClick={() => router.push(`/txn/new/sale?partyId=${selected.id}`)}
                      >
                        Create Sale Invoice
                      </Button>
                    }
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Keyed so the form is rebuilt for whichever party is being edited. */}
      {formOpen && (
        <PartyFormModal
          key={editing?.id ?? 'new'}
          open
          onClose={() => {
            setFormOpen(false);
            if (searchParams.get('new') !== null) router.replace('/parties');
          }}
          party={editing}
          onSaved={(p) => setSelectedId(p.id)}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete party"
        message={`Delete ${confirmDelete?.name}? This cannot be undone.`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        loading={deleting}
      />
    </div>
  );
}

function DetailBit({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'danger';
}) {
  return (
    <div>
      <p className="text-[12px] text-ink-faint">{label}</p>
      <p
        className={`mt-0.5 text-[14px] font-medium ${
          tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
