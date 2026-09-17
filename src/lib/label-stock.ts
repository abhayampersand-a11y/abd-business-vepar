/**
 * Label stock (the physical rolls and sheets labels are printed on) and the
 * saved print configuration.
 *
 * All dimensions are millimetres. Preset sizes are the ones sold for Indian
 * desktop label printers (TSC, TVS, Zebra, Godex, Xprinter), 58/80 mm receipt
 * printers, and A4 sticker sheets cut to the common Avery-compatible layouts.
 */

import type { QrEcc } from './qr';

export type { QrEcc };

export type StockKind = 'roll' | 'sheet';

export type LabelStockSpec = {
  kind: StockKind;
  /** A roll with no gap between labels, e.g. receipt paper. */
  continuous: boolean;
  widthMm: number;
  heightMm: number;
  /** Labels side by side across the roll or sheet. */
  columns: number;
  /** Rows per sheet; ignored for rolls. */
  rows: number;
  /** Space between labels across. */
  gapXMm: number;
  /** Space between labels down: the die-cut gap on a roll, the row gap on a sheet. */
  gapYMm: number;
  /** Roll: liner edge to the first label. Sheet: page edge to the first label. */
  marginLeftMm: number;
  /** Sheet only: page top to the first row. */
  marginTopMm: number;
  pageWidthMm: number;
  pageHeightMm: number;
};

export type LabelStockPreset = {
  id: string;
  group: 'Thermal label roll' | 'Receipt printer roll' | 'A4 sticker sheet';
  name: string;
  stock: LabelStockSpec;
};

const roll = (
  id: string,
  name: string,
  widthMm: number,
  heightMm: number,
  columns = 1,
  gapXMm = 0,
  marginLeftMm = 0,
): LabelStockPreset => ({
  id,
  group: 'Thermal label roll',
  name,
  stock: {
    kind: 'roll',
    continuous: false,
    widthMm,
    heightMm,
    columns,
    rows: 1,
    gapXMm,
    gapYMm: 2,
    marginLeftMm,
    marginTopMm: 0,
    pageWidthMm: 0,
    pageHeightMm: 0,
  },
});

const receipt = (id: string, name: string, widthMm: number, heightMm: number): LabelStockPreset => ({
  id,
  group: 'Receipt printer roll',
  name,
  stock: {
    kind: 'roll',
    continuous: true,
    widthMm,
    heightMm,
    columns: 1,
    rows: 1,
    gapXMm: 0,
    // Blank feed between labels so they can be torn apart.
    gapYMm: 4,
    marginLeftMm: 0,
    marginTopMm: 0,
    pageWidthMm: 0,
    pageHeightMm: 0,
  },
});

/** A4 sheets are centred on the page, so the margins follow from the grid. */
const a4 = (
  id: string,
  name: string,
  widthMm: number,
  heightMm: number,
  columns: number,
  rows: number,
  gapXMm: number,
): LabelStockPreset => ({
  id,
  group: 'A4 sticker sheet',
  name,
  stock: {
    kind: 'sheet',
    continuous: false,
    widthMm,
    heightMm,
    columns,
    rows,
    gapXMm,
    gapYMm: 0,
    marginLeftMm: round1((210 - (columns * widthMm + (columns - 1) * gapXMm)) / 2),
    marginTopMm: round1((297 - rows * heightMm) / 2),
    pageWidthMm: 210,
    pageHeightMm: 297,
  },
});

function round1(n: number) {
  return Math.round(n * 100) / 100;
}

export const LABEL_STOCK_PRESETS: LabelStockPreset[] = [
  roll('roll-50x25', '50 × 25 mm — 1 across', 50, 25),
  roll('roll-38x25-2', '38 × 25 mm — 2 across (80 mm roll)', 38, 25, 2, 2, 1),
  roll('roll-25x25-3', '25 × 25 mm — 3 across', 25, 25, 3, 2, 0.5),
  roll('roll-50x38', '50 × 38 mm — 1 across', 50, 38),
  roll('roll-50x50', '50 × 50 mm — 1 across', 50, 50),
  roll('roll-75x50', '75 × 50 mm — 1 across', 75, 50),
  roll('roll-100x50', '100 × 50 mm — 1 across', 100, 50),
  roll('roll-100x150', '100 × 150 mm — carton / shipping', 100, 150),
  receipt('receipt-58', '58 mm receipt paper (48 mm print width)', 48, 40),
  receipt('receipt-80', '80 mm receipt paper (72 mm print width)', 72, 50),
  a4('a4-65', '65 per sheet — 38.1 × 21.2 mm (L7651)', 38.1, 21.2, 5, 13, 2.5),
  a4('a4-40', '40 per sheet — 45.7 × 25.4 mm (L7654)', 45.7, 25.4, 4, 10, 2.6),
  a4('a4-24', '24 per sheet — 64 × 33.9 mm (L7159)', 64, 33.9, 3, 8, 2.5),
  a4('a4-21', '21 per sheet — 63.5 × 38.1 mm (L7160)', 63.5, 38.1, 3, 7, 2.5),
  a4('a4-14', '14 per sheet — 99.1 × 38.1 mm (L7163)', 99.1, 38.1, 2, 7, 2.5),
  a4('a4-8', '8 per sheet — 99.1 × 67.7 mm (L7165)', 99.1, 67.7, 2, 4, 2.5),
];

export const CUSTOM_STOCK_ID = 'custom';

/* ------------------------------------------------------------------ *
 * Print configuration
 * ------------------------------------------------------------------ */

/** What the QR holds: a link a phone opens, or just the code for scanners. */
export type QrContent = 'link' | 'code';

/** 203/300 are thermal label printers; 600 stands for laser and inkjet. */
export type PrinterDpi = 203 | 300 | 600;

export type LabelContent = {
  businessName: boolean;
  itemName: boolean;
  itemCode: boolean;
  price: boolean;
};

export type LabelConfig = {
  stockId: string;
  stock: LabelStockSpec;
  content: LabelContent;
  qrContent: QrContent;
  ecc: QrEcc;
  dpi: PrinterDpi;
  /** Shifts everything to correct a printer that prints slightly off. */
  offsetXMm: number;
  offsetYMm: number;
  /** Sheet only: positions already used on a partly used first sheet. */
  skip: number;
  /** Dashed label edges — for test prints on plain paper. */
  outlines: boolean;
};

export const SETTINGS_KEY = 'label_print_config';

export function presetById(id: string) {
  return LABEL_STOCK_PRESETS.find((p) => p.id === id);
}

export const DEFAULT_LABEL_CONFIG: LabelConfig = {
  stockId: 'roll-50x25',
  stock: presetById('roll-50x25')!.stock,
  content: { businessName: false, itemName: true, itemCode: true, price: true },
  qrContent: 'link',
  ecc: 'M',
  dpi: 203,
  offsetXMm: 0,
  offsetYMm: 0,
  skip: 0,
  outlines: false,
};

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Makes any stored or typed stock usable: finite, positive and bounded. */
export function sanitizeStock(raw: Partial<LabelStockSpec> | undefined, fallback: LabelStockSpec): LabelStockSpec {
  const s = raw ?? {};
  const kind: StockKind = s.kind === 'sheet' ? 'sheet' : s.kind === 'roll' ? 'roll' : fallback.kind;
  return {
    kind,
    continuous: kind === 'roll' && Boolean(s.continuous ?? fallback.continuous),
    widthMm: clamp(s.widthMm, 10, 300, fallback.widthMm),
    heightMm: clamp(s.heightMm, 10, 300, fallback.heightMm),
    columns: Math.round(clamp(s.columns, 1, 10, fallback.columns)),
    rows: Math.round(clamp(s.rows, 1, 40, fallback.rows)),
    gapXMm: clamp(s.gapXMm, 0, 50, fallback.gapXMm),
    gapYMm: clamp(s.gapYMm, 0, 50, fallback.gapYMm),
    marginLeftMm: clamp(s.marginLeftMm, 0, 100, fallback.marginLeftMm),
    marginTopMm: clamp(s.marginTopMm, 0, 100, fallback.marginTopMm),
    pageWidthMm: clamp(s.pageWidthMm, 0, 500, fallback.pageWidthMm || 210),
    pageHeightMm: clamp(s.pageHeightMm, 0, 500, fallback.pageHeightMm || 297),
  };
}

/** Reads the saved configuration, falling back field by field to the defaults. */
export function parseLabelConfig(raw: string | null | undefined): LabelConfig {
  let stored: Partial<LabelConfig> = {};
  try {
    stored = raw ? (JSON.parse(raw) as Partial<LabelConfig>) : {};
  } catch {
    stored = {};
  }
  const d = DEFAULT_LABEL_CONFIG;
  const preset = stored.stockId ? presetById(stored.stockId) : undefined;
  const stockId = preset || stored.stockId === CUSTOM_STOCK_ID ? stored.stockId! : d.stockId;
  // A preset always prints at its published size; only custom stock is taken as stored.
  const stock = preset ? preset.stock : sanitizeStock(stored.stock, d.stock);
  const content = stored.content ?? d.content;

  return {
    stockId,
    stock,
    content: {
      businessName: Boolean(content.businessName),
      itemName: Boolean(content.itemName),
      itemCode: Boolean(content.itemCode),
      price: Boolean(content.price),
    },
    qrContent: stored.qrContent === 'code' ? 'code' : 'link',
    ecc: stored.ecc === 'L' || stored.ecc === 'Q' ? stored.ecc : 'M',
    dpi: stored.dpi === 300 || stored.dpi === 600 ? stored.dpi : 203,
    offsetXMm: clamp(stored.offsetXMm, -10, 10, 0),
    offsetYMm: clamp(stored.offsetYMm, -10, 10, 0),
    skip: Math.round(clamp(stored.skip, 0, 399, 0)),
    outlines: Boolean(stored.outlines),
  };
}

/** Width of one printed row (roll) or the page (sheet). */
export function pageSize(stock: LabelStockSpec) {
  if (stock.kind === 'sheet') return { widthMm: stock.pageWidthMm, heightMm: stock.pageHeightMm };
  return {
    widthMm: round1(
      stock.marginLeftMm * 2 + stock.columns * stock.widthMm + (stock.columns - 1) * stock.gapXMm,
    ),
    heightMm: round1(stock.heightMm + (stock.continuous ? stock.gapYMm : 0)),
  };
}

export const labelsPerPage = (stock: LabelStockSpec) =>
  stock.kind === 'sheet' ? stock.columns * stock.rows : stock.columns;
