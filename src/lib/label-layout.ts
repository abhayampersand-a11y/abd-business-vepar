import type { LabelConfig, LabelContent, LabelStockSpec, PrinterDpi } from './label-stock';
import { pageSize } from './label-stock';

/**
 * Where everything sits on one label, in millimetres from its top-left corner.
 *
 * The same geometry drives the browser print, the on-screen preview and the
 * TSPL/ZPL printer files, so all three put the QR and text in the same place.
 */

export type TextLine = 'business' | 'name' | 'code' | 'price';

/** Relative size of each text line against the base font. */
export const LINE_SCALE: Record<TextLine, number> = {
  business: 0.8,
  name: 1,
  code: 0.9,
  price: 1.15,
};
export const LINE_HEIGHT = 1.2;

/** Smallest text that stays readable off a 203 dpi thermal head (about 4.5 pt). */
export const MIN_FONT_MM = 1.6;
const MAX_FONT_MM = 3.4;
/** Space between the QR and the text. */
const GAP_MM = 0.8;

export type LabelGeometry = {
  orientation: 'stack' | 'side';
  paddingMm: number;
  /** Square the QR (quiet zone included) is centred in. */
  qrBox: { x: number; y: number; size: number };
  text: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontMm: number;
    nameLines: number;
    lines: TextLine[];
    align: 'center' | 'left';
  } | null;
  /** Lines asked for that did not fit. */
  dropped: TextLine[];
  /** Text still overflows at the smallest font. */
  cramped: boolean;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function textBlockHeight(lines: TextLine[], fontMm: number, nameLines: number) {
  return lines.reduce(
    (h, l) => h + (l === 'name' ? nameLines : 1) * fontMm * LINE_SCALE[l] * LINE_HEIGHT,
    0,
  );
}

function wantedLines(content: LabelContent): TextLine[] {
  const lines: TextLine[] = [];
  if (content.businessName) lines.push('business');
  if (content.itemName) lines.push('name');
  if (content.itemCode) lines.push('code');
  if (content.price) lines.push('price');
  return lines;
}

/**
 * Shrinks text until it fits `maxHeight`: fewer name lines first, then drop the
 * business name, then a smaller font. The QR is never given up for text.
 */
function fitText(lines: TextLine[], fontMm: number, maxHeight: number, maxNameLines: number) {
  let nameLines = maxNameLines;
  let font = fontMm;
  let kept = [...lines];
  const dropped: TextLine[] = [];
  for (let guard = 0; guard < 40; guard++) {
    if (textBlockHeight(kept, font, nameLines) <= maxHeight + 0.01) {
      return { lines: kept, font, nameLines, dropped, cramped: false };
    }
    if (kept.includes('name') && nameLines > 1) nameLines--;
    else if (kept.includes('business')) {
      kept = kept.filter((l) => l !== 'business');
      dropped.push('business');
    } else if (font > MIN_FONT_MM) font = Math.max(MIN_FONT_MM, font - 0.2);
    else break;
  }
  return { lines: kept, font, nameLines, dropped, cramped: true };
}

export function computeGeometry(stock: LabelStockSpec, content: LabelContent): LabelGeometry {
  const w = stock.widthMm;
  const h = stock.heightMm;
  const p = clamp(Math.min(w, h) * 0.06, 1, 2.5);
  const innerW = w - 2 * p;
  const innerH = h - 2 * p;
  const wanted = wantedLines(content);

  if (!wanted.length) {
    const size = Math.min(innerW, innerH);
    return {
      orientation: 'stack',
      paddingMm: p,
      qrBox: { x: p + (innerW - size) / 2, y: p + (innerH - size) / 2, size },
      text: null,
      dropped: [],
      cramped: false,
    };
  }

  // Wide labels read best with the QR on the left and text beside it.
  if (w / h >= 1.25) {
    const minTextW = Math.max(12, w * 0.35);
    let qr = innerH;
    if (innerW - qr - GAP_MM < minTextW) qr = Math.max(innerW * 0.45, innerW - GAP_MM - minTextW);
    qr = Math.min(qr, innerH);
    const textW = innerW - qr - GAP_MM;
    const fit = fitText(wanted, clamp(h * 0.1, MIN_FONT_MM, MAX_FONT_MM), innerH, 3);
    const th = textBlockHeight(fit.lines, fit.font, fit.nameLines);
    return {
      orientation: 'side',
      paddingMm: p,
      qrBox: { x: p, y: p + (innerH - qr) / 2, size: qr },
      text: {
        x: p + qr + GAP_MM,
        y: p + Math.max(0, (innerH - th) / 2),
        width: textW,
        height: Math.min(th, innerH),
        fontMm: fit.font,
        nameLines: fit.nameLines,
        lines: fit.lines,
        align: 'left',
      },
      dropped: fit.dropped,
      cramped: fit.cramped,
    };
  }

  // Square and tall labels: QR on top, text centred underneath. The QR keeps at
  // least half the label; the text is squeezed to fit what is left.
  const minQr = Math.min(innerW, innerH) * 0.5;
  const maxTextH = Math.max(0, innerH - minQr - GAP_MM);
  const fit = fitText(wanted, clamp(w * 0.07, MIN_FONT_MM, MAX_FONT_MM), maxTextH, 2);
  const th = Math.min(textBlockHeight(fit.lines, fit.font, fit.nameLines), maxTextH);
  const qr = Math.min(innerW, innerH - th - GAP_MM);
  const top = p + (innerH - (qr + GAP_MM + th)) / 2;
  return {
    orientation: 'stack',
    paddingMm: p,
    qrBox: { x: p + (innerW - qr) / 2, y: top, size: qr },
    text: {
      x: p,
      y: top + qr + GAP_MM,
      width: innerW,
      height: th,
      fontMm: fit.font,
      nameLines: fit.nameLines,
      lines: fit.lines,
      align: 'center',
    },
    dropped: fit.dropped,
    cramped: fit.cramped,
  };
}

/* ------------------------------------------------------------------ *
 * Fitting the QR to the printer's dot grid
 * ------------------------------------------------------------------ */

export const dotsPerMm = (dpi: PrinterDpi) => dpi / 25.4;

/**
 * Sizes a QR so every module is a whole number of printer dots. A thermal head
 * cannot print a fraction of a dot, so a 0.3 mm module on a 203 dpi printer
 * comes out as uneven 2- and 3-dot squares that scanners misread. Laser and
 * inkjet (600) are fine enough to scale freely.
 */
export function fitQr(boxMm: number, totalModules: number, dpi: PrinterDpi) {
  const raw = boxMm / totalModules;
  if (dpi >= 600) return { sizeMm: boxMm, moduleMm: raw, dots: null as number | null };
  const dot = 25.4 / dpi;
  const dots = Math.floor(raw / dot);
  // Below one dot there is no honest size; keep the raw one and let the warning speak.
  const moduleMm = dots >= 1 ? dots * dot : raw;
  return { sizeMm: moduleMm * totalModules, moduleMm, dots };
}

/* ------------------------------------------------------------------ *
 * Pages and positions
 * ------------------------------------------------------------------ */

export type Slot = { xMm: number; yMm: number };

/** Label positions on one printed page (a roll row or a sheet), row by row. */
export function pageSlots(stock: LabelStockSpec): Slot[] {
  const slots: Slot[] = [];
  const rows = stock.kind === 'sheet' ? stock.rows : 1;
  const top = stock.kind === 'sheet' ? stock.marginTopMm : 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < stock.columns; c++) {
      slots.push({
        xMm: stock.marginLeftMm + c * (stock.widthMm + stock.gapXMm),
        yMm: top + r * (stock.heightMm + stock.gapYMm),
      });
    }
  }
  return slots;
}

/** Spreads labels over pages; a sheet's first page leaves `skip` positions empty. */
export function paginate<T>(labels: T[], stock: LabelStockSpec, skip: number) {
  const slots = pageSlots(stock);
  const pages: Array<Array<{ label: T; slot: Slot }>> = [];
  let page: Array<{ label: T; slot: Slot }> = [];
  let position = stock.kind === 'sheet' ? Math.min(skip, slots.length - 1) : 0;
  for (const label of labels) {
    page.push({ label, slot: slots[position] });
    position++;
    if (position === slots.length) {
      pages.push(page);
      page = [];
      position = 0;
    }
  }
  if (page.length) pages.push(page);
  return pages;
}

/* ------------------------------------------------------------------ *
 * Checks shown before printing
 * ------------------------------------------------------------------ */

export type LabelWarning = { level: 'error' | 'warn' | 'info'; message: string };

const mm = (n: number) => `${Math.round(n * 100) / 100} mm`;

/**
 * Plain-language checks for the chosen stock and content.
 * `linkModules` / `codeModules` are the largest QR module counts (quiet zone
 * included) among the labels, for link and code-only content.
 */
export function assessLabels(
  config: LabelConfig,
  geometry: LabelGeometry,
  modules: { link: number; code: number },
): LabelWarning[] {
  const out: LabelWarning[] = [];
  const { stock, dpi } = config;
  const current = config.qrContent === 'link' ? modules.link : modules.code;
  const fit = fitQr(geometry.qrBox.size, current, dpi);

  if (fit.dots !== null && fit.dots < 2) {
    out.push({
      level: 'error',
      message: `The QR is too dense for a ${dpi} dpi printer on this label — each square would be under 2 printer dots and will not scan. Use a bigger label, “Code only” QR, or error correction L.`,
    });
  } else if (fit.moduleMm < 0.3) {
    out.push({
      level: 'warn',
      message: `QR squares are ${mm(fit.moduleMm)}. Phone cameras struggle below 0.3 mm; a USB scanner will usually still read it.`,
    });
  }

  if (config.qrContent === 'link' && fit.moduleMm < 0.4) {
    const codeFit = fitQr(geometry.qrBox.size, modules.code, dpi);
    if (codeFit.moduleMm > fit.moduleMm * 1.15) {
      out.push({
        level: 'info',
        message: `“Code only” QR would make each square ${mm(codeFit.moduleMm)} instead of ${mm(fit.moduleMm)} — easier to scan, but a phone camera shows the code instead of opening the item.`,
      });
    }
  }

  if (fit.sizeMm < 10) {
    out.push({ level: 'warn', message: `The QR prints ${mm(fit.sizeMm)} wide. Aim for at least 10 mm.` });
  }

  if (geometry.dropped.includes('business')) {
    out.push({ level: 'info', message: 'The business name does not fit on this label and is left out.' });
  }
  if (geometry.cramped) {
    out.push({ level: 'warn', message: 'The text does not fit even at the smallest size and will be cut off. Untick a line or use a bigger label.' });
  }

  const page = pageSize(stock);
  if (stock.kind === 'sheet') {
    const right = stock.marginLeftMm + stock.columns * stock.widthMm + (stock.columns - 1) * stock.gapXMm;
    const bottom = stock.marginTopMm + stock.rows * stock.heightMm + (stock.rows - 1) * stock.gapYMm;
    if (right > page.widthMm + 0.5 || bottom > page.heightMm + 0.5) {
      out.push({ level: 'error', message: 'Labels run off the page. Check the margins, gaps, columns and rows.' });
    } else if (stock.marginLeftMm < 3 || stock.marginTopMm < 3) {
      out.push({ level: 'info', message: 'Most office printers cannot print within 3–4 mm of the paper edge; labels near the edge may be clipped.' });
    }
  } else if (page.widthMm > 108 && dpi < 600) {
    out.push({ level: 'warn', message: `This roll is ${mm(page.widthMm)} wide; 4-inch desktop label printers print at most 104–108 mm.` });
  }

  return out;
}
