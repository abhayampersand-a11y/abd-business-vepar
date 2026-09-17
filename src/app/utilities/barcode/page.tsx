'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { QrCode as QrIcon } from 'lucide-react';
import {
  useGetBootstrapQuery,
  useGetItemsQuery,
  useUpdateSettingsMutation,
} from '@/store/api';
import { Checkbox, EmptyState, Input, PageHeader, SearchInput, Spinner } from '@/components/ui';
import { LabelPrintPanel } from '@/components/labels/LabelPrintPanel';
import { parseLabelConfig, SETTINGS_KEY, type LabelConfig } from '@/lib/label-stock';
import type { LabelItem } from '@/lib/labels';
import { formatCurrency, formatQty, num } from '@/lib/format';

export default function LabelPrintingPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LabelPrintingScreen />
    </Suspense>
  );
}

/** Bulk QR labels: tick the items, set how many of each, then print to any stock. */
function LabelPrintingScreen() {
  const searchParams = useSearchParams();
  const { data: items = [], isLoading } = useGetItemsQuery({ active: 'true' });
  const { data: bootstrap } = useGetBootstrapQuery();
  const [updateSettings] = useUpdateSettingsMutation();

  const [search, setSearch] = useState('');
  // item id → copies, for the ticked items only. ?item=<id> arrives ticked.
  const [copies, setCopies] = useState<Record<number, string>>(() => {
    const id = Number(searchParams.get('item'));
    return Number.isInteger(id) && id > 0 ? { [id]: '1' } : {};
  });

  const labelled = useMemo(() => items.filter((i) => i.itemCode), [items]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return labelled;
    return labelled.filter(
      (i) => i.name.toLowerCase().includes(q) || i.itemCode?.toLowerCase().includes(q),
    );
  }, [labelled, search]);

  const labels = useMemo<LabelItem[]>(
    () =>
      labelled
        .filter((i) => i.id in copies)
        .flatMap((i) =>
          Array.from({ length: Math.max(0, Math.floor(num(copies[i.id]))) }, () => ({
            name: i.name,
            itemCode: i.itemCode ?? '',
            price: formatCurrency(i.salePrice),
          })),
        ),
    [labelled, copies],
  );

  const allShownTicked = shown.length > 0 && shown.every((i) => i.id in copies);

  const toggle = (id: number, on: boolean, qty?: string) =>
    setCopies((c) => {
      const next = { ...c };
      if (on) next[id] = qty ?? c[id] ?? '1';
      else delete next[id];
      return next;
    });

  const toggleShown = (on: boolean) =>
    setCopies((c) => {
      const next = { ...c };
      for (const i of shown) {
        if (on) next[i.id] = c[i.id] ?? '1';
        else delete next[i.id];
      }
      return next;
    });

  // Remembered for the whole business, so the next print starts on the same stock.
  const saveConfig = (config: LabelConfig) => {
    updateSettings({ [SETTINGS_KEY]: JSON.stringify(config) })
      .unwrap()
      .catch(() => {
        // Printing already happened; losing the remembered settings is not worth an error.
      });
  };

  return (
    <div className="flex min-h-full flex-col lg:h-full">
      <PageHeader
        title="Item QR Labels"
        subtitle="Print square QR labels on label rolls, receipt paper or A4 sticker sheets."
      />

      <div className="grid min-h-0 flex-1 gap-4 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="card flex min-h-80 flex-col overflow-hidden lg:min-h-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name or code"
              className="min-w-48 flex-1"
            />
            <Checkbox
              checked={allShownTicked}
              onChange={toggleShown}
              label={search ? 'Select shown' : 'Select all'}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <Spinner />
            ) : shown.length ? (
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-canvas text-ink-soft">
                  <tr>
                    <th className="w-10 px-3 py-2" />
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-left font-medium">Code</th>
                    <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Price</th>
                    <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Stock</th>
                    <th className="w-24 px-3 py-2 text-right font-medium">Copies</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((i) => {
                    const on = i.id in copies;
                    return (
                      <tr key={i.id} className="border-t border-line">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(e) =>
                              toggle(
                                i.id,
                                e.target.checked,
                                // Default to one label per unit in stock.
                                i.type === 'product' && num(i.stockQty) >= 1
                                  ? String(Math.floor(num(i.stockQty)))
                                  : '1',
                              )
                            }
                            aria-label={`Print labels for ${i.name}`}
                            className="h-4 w-4 accent-[var(--color-accent)]"
                          />
                        </td>
                        <td className="px-3 py-2 text-ink">{i.name}</td>
                        <td className="px-3 py-2 font-mono text-[12.5px] text-ink-soft">
                          {i.itemCode}
                        </td>
                        <td className="hidden px-3 py-2 text-right sm:table-cell">
                          {formatCurrency(i.salePrice)}
                        </td>
                        <td className="hidden px-3 py-2 text-right text-ink-soft sm:table-cell">
                          {i.type === 'product' ? `${formatQty(i.stockQty)} ${i.unitShort}` : '—'}
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            value={copies[i.id] ?? ''}
                            disabled={!on}
                            onChange={(e) => toggle(i.id, true, e.target.value)}
                            className="ml-auto h-8 w-20 text-right"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState
                icon={<QrIcon size={26} />}
                title={search ? 'No matching items' : 'No items yet'}
                description="Items you add get a code, and every code can be printed as a QR label."
              />
            )}
          </div>
        </div>

        <aside className="card p-4 lg:min-h-0 lg:overflow-y-auto">
          {bootstrap ? (
            <LabelPrintPanel
              labels={labels}
              businessName={bootstrap.firm?.name ?? ''}
              initialConfig={parseLabelConfig(bootstrap.settings?.[SETTINGS_KEY])}
              onSaveConfig={saveConfig}
            />
          ) : (
            <Spinner />
          )}
        </aside>
      </div>
    </div>
  );
}
