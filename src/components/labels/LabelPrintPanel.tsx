'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Download, Info, Printer, Ruler, XCircle } from 'lucide-react';
import { Button, Checkbox, Field, Input, Select } from '@/components/ui';
import {
  CUSTOM_STOCK_ID,
  LABEL_STOCK_PRESETS,
  labelsPerPage,
  presetById,
  sanitizeStock,
  type LabelConfig,
  type LabelStockSpec,
  type PrinterDpi,
  type QrEcc,
} from '@/lib/label-stock';
import {
  buildLabelDocument,
  downloadTextFile,
  planLabels,
  printHtmlDocument,
  type LabelItem,
} from '@/lib/labels';
import { buildPrinterFile, printerFileSupport, type PrinterLanguage } from '@/lib/label-commands';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';

export const MAX_LABELS = 2000;

const PRESET_GROUPS = [...new Set(LABEL_STOCK_PRESETS.map((p) => p.group))];

const SAMPLE: LabelItem = { name: 'Sample Item Name', itemCode: 'ITM00001', price: '₹ 250.00' };

/**
 * Everything about how labels come out of the printer: stock, what goes on the
 * label, printer resolution and alignment, a live preview, and the three ways
 * to print (browser, test page, TSPL/ZPL file).
 *
 * Mounted once the saved configuration is known; `initialConfig` is only read
 * on mount.
 */
export function LabelPrintPanel({
  labels,
  businessName,
  initialConfig,
  onSaveConfig,
}: {
  labels: LabelItem[];
  businessName: string;
  initialConfig: LabelConfig;
  onSaveConfig: (config: LabelConfig) => void;
}) {
  const dispatch = useAppDispatch();
  const [config, setConfig] = useState(initialConfig);
  // Bumped when a preset replaces the dimensions, so the number boxes re-read them.
  const [stockRevision, setStockRevision] = useState(0);
  const [language, setLanguage] = useState<PrinterLanguage>('tspl');
  const [showDimensions, setShowDimensions] = useState(initialConfig.stockId === CUSTOM_STOCK_ID);

  const { stock } = config;
  const isSheet = stock.kind === 'sheet';
  const hasLabels = labels.length > 0;

  const set = (patch: Partial<LabelConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const choosePreset = (id: string) => {
    const preset = presetById(id);
    if (preset) {
      setConfig((c) => ({ ...c, stockId: id, stock: preset.stock, skip: 0 }));
      setStockRevision((r) => r + 1);
    } else {
      set({ stockId: CUSTOM_STOCK_ID });
      setShowDimensions(true);
    }
  };

  const editStock = (patch: Partial<LabelStockSpec>) =>
    setConfig((c) => ({
      ...c,
      stockId: CUSTOM_STOCK_ID,
      stock: sanitizeStock({ ...c.stock, ...patch }, c.stock),
    }));

  const plan = useMemo(() => planLabels(labels, config), [labels, config]);
  const preview = useMemo(
    () =>
      buildLabelDocument({
        labels: hasLabels ? labels : Array.from({ length: labelsPerPage(stock) }, () => SAMPLE),
        config,
        businessName,
        mode: 'preview',
        maxPages: isSheet ? 1 : 3,
      }),
    [labels, hasLabels, config, businessName, stock, isSheet],
  );

  const warnings = [...plan.warnings];
  if (labels.length > MAX_LABELS) {
    warnings.unshift({ level: 'error', message: `Print at most ${MAX_LABELS} labels at a time.` });
  }
  const blocked = warnings.some((w) => w.level === 'error');
  const fileUnsupported = printerFileSupport(config);

  const print = () => {
    if (!hasLabels) {
      dispatch(pushToast('Tick at least one item to print', 'error'));
      return;
    }
    const doc = buildLabelDocument({ labels, config, businessName, mode: 'print' });
    if (!printHtmlDocument(doc.html)) dispatch(pushToast('Could not open the print dialog', 'error'));
    onSaveConfig(config);
  };

  const printTest = () => {
    const doc = buildLabelDocument({ labels: [], config, businessName, mode: 'test' });
    printHtmlDocument(doc.html);
    onSaveConfig(config);
  };

  const downloadFile = () => {
    const result = buildPrinterFile(language, labels, config, businessName);
    if (!result.ok) {
      dispatch(pushToast(result.reason, 'error'));
      return;
    }
    downloadTextFile(result.filename, result.content);
    dispatch(pushToast(`Saved ${result.filename}`, 'success'));
    onSaveConfig(config);
  };

  const across = `${stock.columns} across`;
  const summary = isSheet
    ? `${stock.widthMm} × ${stock.heightMm} mm · ${stock.columns} × ${stock.rows} per sheet`
    : `${stock.widthMm} × ${stock.heightMm} mm · ${across} · ${stock.continuous ? 'continuous roll' : `${stock.gapYMm} mm gap`}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Stock */}
      <section className="flex flex-col gap-2.5">
        <Field label="Label stock">
          <Select value={config.stockId} onChange={(e) => choosePreset(e.target.value)}>
            {PRESET_GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {LABEL_STOCK_PRESETS.filter((p) => p.group === group).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={CUSTOM_STOCK_ID}>Custom size…</option>
          </Select>
        </Field>
        <div className="flex items-center justify-between gap-2 text-[12.5px] text-ink-soft">
          <span>{summary}</span>
          <button
            type="button"
            onClick={() => setShowDimensions((v) => !v)}
            className="flex shrink-0 items-center gap-1 font-medium text-accent"
          >
            <Ruler size={13} />
            {showDimensions ? 'Hide sizes' : 'Edit sizes'}
          </button>
        </div>

        {showDimensions && (
          <div className="grid grid-cols-2 gap-2.5 rounded-lg bg-canvas p-3">
            <Field label="Type" className="col-span-2">
              <Select
                value={stock.kind === 'sheet' ? 'sheet' : stock.continuous ? 'continuous' : 'roll'}
                onChange={(e) => {
                  const v = e.target.value;
                  editStock(
                    v === 'sheet'
                      ? { kind: 'sheet', continuous: false, pageWidthMm: stock.pageWidthMm || 210, pageHeightMm: stock.pageHeightMm || 297 }
                      : { kind: 'roll', continuous: v === 'continuous' },
                  );
                  setStockRevision((r) => r + 1);
                }}
              >
                <option value="roll">Label roll (gap between labels)</option>
                <option value="continuous">Continuous roll (receipt paper)</option>
                <option value="sheet">Sheet (A4 / Letter)</option>
              </Select>
            </Field>
            <MmField key={`w${stockRevision}`} label="Label width" value={stock.widthMm} min={10} max={300} onCommit={(v) => editStock({ widthMm: v })} />
            <MmField key={`h${stockRevision}`} label="Label height" value={stock.heightMm} min={10} max={300} onCommit={(v) => editStock({ heightMm: v })} />
            <MmField key={`c${stockRevision}`} label="Across" unit="" value={stock.columns} min={1} max={10} step={1} onCommit={(v) => editStock({ columns: v })} />
            {isSheet && (
              <MmField key={`r${stockRevision}`} label="Rows" unit="" value={stock.rows} min={1} max={40} step={1} onCommit={(v) => editStock({ rows: v })} />
            )}
            <MmField key={`gx${stockRevision}`} label="Gap across" value={stock.gapXMm} min={0} max={50} onCommit={(v) => editStock({ gapXMm: v })} />
            <MmField
              key={`gy${stockRevision}`}
              label={isSheet ? 'Gap down' : stock.continuous ? 'Feed between' : 'Gap (die-cut)'}
              value={stock.gapYMm}
              min={0}
              max={50}
              onCommit={(v) => editStock({ gapYMm: v })}
            />
            <MmField key={`ml${stockRevision}`} label={isSheet ? 'Left margin' : 'Liner edge'} value={stock.marginLeftMm} min={0} max={100} onCommit={(v) => editStock({ marginLeftMm: v })} />
            {isSheet && (
              <>
                <MmField key={`mt${stockRevision}`} label="Top margin" value={stock.marginTopMm} min={0} max={100} onCommit={(v) => editStock({ marginTopMm: v })} />
                <Field label="Paper" className="col-span-2">
                  <Select
                    value={stock.pageWidthMm === 215.9 ? 'letter' : 'a4'}
                    onChange={(e) =>
                      editStock(
                        e.target.value === 'letter'
                          ? { pageWidthMm: 215.9, pageHeightMm: 279.4 }
                          : { pageWidthMm: 210, pageHeightMm: 297 },
                      )
                    }
                  >
                    <option value="a4">A4 — 210 × 297 mm</option>
                    <option value="letter">Letter — 215.9 × 279.4 mm</option>
                  </Select>
                </Field>
              </>
            )}
          </div>
        )}
      </section>

      {/* Content */}
      <section className="flex flex-col gap-2">
        <p className="text-[12.5px] font-medium text-ink-soft">On the label</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <Checkbox checked={config.content.itemName} onChange={(v) => set({ content: { ...config.content, itemName: v } })} label="Item name" />
          <Checkbox checked={config.content.itemCode} onChange={(v) => set({ content: { ...config.content, itemCode: v } })} label="Item code" />
          <Checkbox checked={config.content.price} onChange={(v) => set({ content: { ...config.content, price: v } })} label="Sale price" />
          <Checkbox checked={config.content.businessName} onChange={(v) => set({ content: { ...config.content, businessName: v } })} label="Business name" />
        </div>
        <Field label="QR holds" hint={config.qrContent === 'link' ? 'A phone camera opens the item; a scanner adds it to a bill.' : 'Fewer, bigger squares — best for small labels. Scanners only; a phone camera just shows the code.'}>
          <Select value={config.qrContent} onChange={(e) => set({ qrContent: e.target.value === 'code' ? 'code' : 'link' })}>
            <option value="link">Link to the item</option>
            <option value="code">Item code only</option>
          </Select>
        </Field>
      </section>

      {/* Printer */}
      <section className="grid grid-cols-2 gap-2.5">
        <Field label="Printer" className="col-span-2">
          <Select value={config.dpi} onChange={(e) => set({ dpi: Number(e.target.value) as PrinterDpi })}>
            <option value={203}>Thermal label printer — 203 dpi (most TSC, TVS, Zebra)</option>
            <option value={300}>Thermal label printer — 300 dpi</option>
            <option value={600}>Laser / inkjet printer</option>
          </Select>
        </Field>
        <details className="col-span-2 rounded-lg bg-canvas px-3 py-2 text-[13px]">
          <summary className="cursor-pointer font-medium text-ink-soft">Alignment and advanced</summary>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5 pb-1">
            <MmField label="Move right" value={config.offsetXMm} min={-10} max={10} onCommit={(v) => set({ offsetXMm: v })} hint="− moves left" />
            <MmField label="Move down" value={config.offsetYMm} min={-10} max={10} onCommit={(v) => set({ offsetYMm: v })} hint="− moves up" />
            {isSheet && (
              <MmField
                key={`skip${stockRevision}`}
                label="Skip used labels"
                unit=""
                step={1}
                value={config.skip}
                min={0}
                max={Math.max(0, labelsPerPage(stock) - 1)}
                onCommit={(v) => set({ skip: v })}
                hint="On the first sheet"
              />
            )}
            <Field label="Error correction">
              <Select value={config.ecc} onChange={(e) => set({ ecc: e.target.value as QrEcc })}>
                <option value="L">L — smallest QR</option>
                <option value="M">M — recommended</option>
                <option value="Q">Q — rough handling</option>
              </Select>
            </Field>
            <div className="col-span-2">
              <Checkbox checked={config.outlines} onChange={(v) => set({ outlines: v })} label="Print label outlines (plain-paper tests)" />
            </div>
          </div>
        </details>
      </section>

      {/* Preview */}
      <section>
        <div className="mb-1.5 flex items-center justify-between text-[12px] text-ink-faint">
          <span>{hasLabels ? 'Preview' : 'Sample preview'}</span>
          {hasLabels && (
            <span>
              {labels.length} label{labels.length === 1 ? '' : 's'} · {plan.pages.length} {isSheet ? 'sheet' : 'row'}
              {plan.pages.length === 1 ? '' : 's'}
              {preview.shownPages < preview.pageCount ? ` · showing ${preview.shownPages}` : ''}
            </span>
          )}
        </div>
        <iframe
          title="Label preview"
          srcDoc={preview.html}
          className={clsx('w-full rounded-lg border border-line bg-canvas', isSheet ? 'h-96' : 'h-56')}
        />
      </section>

      {warnings.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {warnings.map((w) => (
            <li
              key={w.message}
              className={clsx(
                'flex items-start gap-2 rounded-lg px-3 py-2 text-[12.5px] leading-snug',
                w.level === 'error' && 'bg-danger-soft text-danger',
                w.level === 'warn' && 'bg-warning/10 text-ink',
                w.level === 'info' && 'bg-accent-soft text-ink-soft',
              )}
            >
              {w.level === 'error' ? (
                <XCircle size={15} className="mt-px shrink-0" />
              ) : w.level === 'warn' ? (
                <AlertTriangle size={15} className="mt-px shrink-0 text-warning" />
              ) : (
                <Info size={15} className="mt-px shrink-0 text-accent" />
              )}
              {w.message}
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <section className="flex flex-col gap-2">
        <Button icon={<Printer size={15} />} onClick={print} disabled={!hasLabels || blocked}>
          Print {hasLabels ? labels.length : ''} label{labels.length === 1 ? '' : 's'}
        </Button>
        <Button variant="secondary" icon={<Ruler size={15} />} onClick={printTest}>
          Print alignment test
        </Button>
        <div className="flex gap-2">
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value === 'zpl' ? 'zpl' : 'tspl')}
            disabled={Boolean(fileUnsupported)}
            className="flex-1"
            aria-label="Printer language"
          >
            <option value="tspl">TSPL file — TSC, TVS, Xprinter, Godex</option>
            <option value="zpl">ZPL file — Zebra</option>
          </Select>
          <Button
            variant="secondary"
            icon={<Download size={15} />}
            onClick={downloadFile}
            disabled={Boolean(fileUnsupported) || !hasLabels || blocked}
            title={fileUnsupported ?? undefined}
          >
            File
          </Button>
        </div>
        {fileUnsupported && <p className="text-[12px] text-ink-faint">{fileUnsupported}</p>}
      </section>

      <PrintHelp kind={isSheet ? 'sheet' : stock.continuous ? 'receipt' : 'roll'} stock={stock} />
    </div>
  );
}

/** A millimetre box that accepts partial typing and commits only valid numbers. */
function MmField({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = 'mm',
  hint,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const commit = (raw: string) => {
    const v = Number(raw);
    if (raw.trim() !== '' && Number.isFinite(v) && v >= min && v <= max) {
      // Retyping the same number must not turn a preset into a custom size.
      if (v !== value) onCommit(step === 1 ? Math.round(v) : v);
      return true;
    }
    return false;
  };
  return (
    <Field label={unit ? `${label} (${unit})` : label} hint={hint}>
      <Input
        type="number"
        inputMode="decimal"
        value={text}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        onBlur={() => {
          if (!commit(text)) setText(String(value));
        }}
        className="h-8.5"
      />
    </Field>
  );
}

/** What to set in the operating system's print dialog for each kind of stock. */
function PrintHelp({ kind, stock }: { kind: 'roll' | 'receipt' | 'sheet'; stock: LabelStockSpec }) {
  const size = `${stock.widthMm} × ${stock.heightMm} mm`;
  const steps =
    kind === 'sheet'
      ? [
          'Destination: your office printer. Paper size: A4.',
          'Margins: None. Scale: 100% / Actual size — never “Fit to page”.',
          'Turn off Headers and footers.',
          'Print the alignment test on plain paper, hold it over a sticker sheet against light, and set Move right / Move down until the crosses sit in the labels.',
          'Partly used sheet? Put it back in the tray and set “Skip used labels”.',
        ]
      : kind === 'receipt'
        ? [
            'Destination: the receipt printer. Paper: its roll (58 or 80 mm).',
            'Margins: None. Scale: 100%.',
            'Turn off Headers and footers.',
          ]
        : [
            `Once, in Windows: Printer properties → Preferences → Page setup / Stock — create a ${size} stock with a ${stock.gapYMm} mm gap${stock.columns > 1 ? ` (${stock.columns} across, full roll width)` : ''}, and set the media to Gap/Web sensing.`,
            'Calibrate the printer so it finds the gap (TSC/TVS: hold FEED until it feeds a label; Zebra: hold FEED until it flashes twice).',
            'In the print dialog: Destination the label printer, Margins None, Scale 100%, Headers and footers off.',
            'Print the alignment test first; if everything is shifted, set Move right / Move down.',
            'Want the crispest QR? Download the TSPL or ZPL file and send it with the printer’s utility (TSC Console → Send file, Zebra Setup Utilities → Send file), or share the printer and run: copy /b item-labels.prn \\\\localhost\\PrinterShareName',
          ];
  return (
    <details className="rounded-lg border border-line px-3 py-2 text-[12.5px] text-ink-soft">
      <summary className="cursor-pointer font-medium">Printer and print-dialog settings</summary>
      <ol className="mt-2 list-decimal space-y-1.5 pb-1 pl-4 leading-snug">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </details>
  );
}
