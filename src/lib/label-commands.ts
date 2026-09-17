import { encode } from 'uqr';
import type { LabelConfig } from './label-stock';
import { pageSize } from './label-stock';
import { LINE_SCALE, computeGeometry, dotsPerMm, paginate, type TextLine } from './label-layout';
import { QUIET_ZONE } from './qr';
import { qrTextFor, type LabelItem } from './labels';

/**
 * Printer command files for thermal label printers.
 *
 * TSPL is the language of TSC, TVS, Xprinter, Godex (in emulation) and most
 * low-cost Chinese label printers; ZPL is Zebra's. The printer draws the QR
 * with its own encoder at its native resolution, which gives the sharpest
 * possible code — the browser route goes through a Windows driver that
 * rasterises the page first.
 *
 * Built-in printer fonts are ASCII only, so names in Gujarati or Hindi are
 * dropped from the text (the QR still carries the full link or code).
 */

export type PrinterLanguage = 'tspl' | 'zpl';

export type PrinterFileResult =
  | { ok: true; filename: string; content: string }
  | { ok: false; reason: string };

/** TSPL bitmap fonts: name, character width and height in dots. */
const TSPL_FONTS = [
  { name: '1', w: 8, h: 12 },
  { name: '2', w: 12, h: 20 },
  { name: '3', w: 16, h: 24 },
  { name: '4', w: 24, h: 32 },
  { name: '5', w: 32, h: 48 },
];

const ascii = (s: string) =>
  s
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Breaks text into at most `maxLines` lines of `perLine` characters. */
function wrap(text: string, perLine: number, maxLines: number) {
  if (perLine < 1) return [];
  const lines: string[] = [];
  let rest = text;
  while (rest && lines.length < maxLines) {
    if (rest.length <= perLine) {
      lines.push(rest);
      break;
    }
    let cut = rest.lastIndexOf(' ', perLine);
    if (cut <= 0) cut = perLine;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  return lines;
}

export function printerFileSupport(config: LabelConfig): string | null {
  if (config.stock.kind !== 'roll') return 'Printer files are for label rolls. Sheets print from the browser.';
  if (config.stock.continuous) return 'Receipt printers use ESC/POS, not TSPL or ZPL. Print from the browser instead.';
  if (config.dpi === 600) return 'Choose the label printer’s resolution (203 or 300 dpi) first.';
  return null;
}

export function buildPrinterFile(
  language: PrinterLanguage,
  labels: LabelItem[],
  config: LabelConfig,
  businessName = '',
): PrinterFileResult {
  const unsupported = printerFileSupport(config);
  if (unsupported) return { ok: false, reason: unsupported };
  if (!labels.length) return { ok: false, reason: 'Tick at least one item.' };

  const { stock } = config;
  const dpmm = dotsPerMm(config.dpi);
  const d = (mm: number) => Math.round(mm * dpmm);
  /** Printers reject negative coordinates, so an offset past the edge stops at 0. */
  const pos = (dots: number) => Math.max(0, dots);
  const geometry = computeGeometry(stock, config.content);
  const page = pageSize(stock);
  const rows = paginate(labels, stock, 0);

  const valueOf = (item: LabelItem, line: TextLine) =>
    ascii(
      line === 'business'
        ? businessName
        : line === 'name'
          ? item.name
          : line === 'code'
            ? item.itemCode
            : item.price.replace('₹', 'Rs.'),
    );

  /** QR cell size in dots, and the offset that keeps the quiet zone clear. */
  const qrCell = (text: string) => {
    const modules = encode(text, { ecc: config.ecc, border: 0 }).size;
    const total = modules + QUIET_ZONE * 2;
    const cell = Math.min(10, Math.floor(d(geometry.qrBox.size) / total));
    const drawn = cell * total;
    return {
      cell,
      xOffset: Math.round((d(geometry.qrBox.size) - drawn) / 2) + cell * QUIET_ZONE,
      yOffset: Math.round((d(geometry.qrBox.size) - drawn) / 2) + cell * QUIET_ZONE,
    };
  };

  const tooSmall = labels.some((l) => qrCell(qrTextFor(l, config)).cell < 1);
  if (tooSmall) {
    return { ok: false, reason: 'The QR does not fit this label at the printer’s resolution. Use a bigger label or “Code only” QR.' };
  }

  const out: string[] = [];
  const t = geometry.text;

  if (language === 'tspl') {
    out.push(
      `SIZE ${page.widthMm} mm,${page.heightMm} mm`,
      `GAP ${stock.gapYMm} mm,0 mm`,
      'DIRECTION 1',
      'REFERENCE 0,0',
      `SHIFT ${d(config.offsetYMm)}`,
      'SET TEAR ON',
    );
    for (const row of rows) {
      out.push('CLS');
      for (const { label, slot } of row) {
        const ox = d(slot.xMm + config.offsetXMm);
        const data = qrTextFor(label, config).replace(/"/g, '\\["]');
        const qr = qrCell(qrTextFor(label, config));
        out.push(
          `QRCODE ${pos(ox + d(geometry.qrBox.x) + qr.xOffset)},${pos(d(geometry.qrBox.y) + qr.yOffset)},${config.ecc},${qr.cell},A,0,"${data}"`,
        );
        if (!t) continue;
        let y = d(t.y);
        for (const line of t.lines) {
          const target = d(t.fontMm * LINE_SCALE[line]);
          const font = [...TSPL_FONTS].reverse().find((f) => f.h <= target) ?? TSPL_FONTS[0];
          const perLine = Math.floor(d(t.width) / font.w);
          const texts = wrap(valueOf(label, line), perLine, line === 'name' ? t.nameLines : 1);
          for (const text of texts) {
            const x =
              t.align === 'center'
                ? d(t.x) + Math.max(0, Math.round((d(t.width) - text.length * font.w) / 2))
                : d(t.x);
            out.push(`TEXT ${pos(ox + x)},${pos(y)},"${font.name}",0,1,1,"${text.replace(/"/g, '\\["]')}"`);
            y += font.h + 2;
          }
        }
      }
      out.push('PRINT 1,1');
    }
    return { ok: true, filename: `item-labels-${stock.widthMm}x${stock.heightMm}.prn`, content: out.join('\r\n') + '\r\n' };
  }

  // ZPL. ^FH_ turns _5E-style hex escapes back into ^, ~ and _ inside field data.
  const zplEscape = (s: string) => s.replace(/[_^~]/g, (c) => `_${c.charCodeAt(0).toString(16).toUpperCase()}`);
  for (const row of rows) {
    out.push('^XA', '^CI28', `^PW${d(page.widthMm)}`, `^LL${d(page.heightMm)}`, '^LH0,0');
    for (const { label, slot } of row) {
      const ox = d(slot.xMm + config.offsetXMm);
      const oy = d(config.offsetYMm);
      const text = qrTextFor(label, config);
      const qr = qrCell(text);
      out.push(
        `^FO${pos(ox + d(geometry.qrBox.x) + qr.xOffset)},${pos(oy + d(geometry.qrBox.y) + qr.yOffset)}^BQN,2,${qr.cell}^FH_^FD${config.ecc}A,${zplEscape(text)}^FS`,
      );
      if (!t) continue;
      let y = d(t.y);
      for (const line of t.lines) {
        const h = Math.max(12, d(t.fontMm * LINE_SCALE[line]));
        const lines = line === 'name' ? t.nameLines : 1;
        // ^A0 is proportional; about 0.55 × height per character on average.
        const perLine = Math.floor(d(t.width) / (h * 0.55));
        const wrapped = wrap(valueOf(label, line), perLine, lines);
        if (!wrapped.length) continue;
        out.push(
          `^FO${pos(ox + d(t.x))},${pos(oy + y)}^A0N,${h},${h}^FB${d(t.width)},${wrapped.length},0,${t.align === 'center' ? 'C' : 'L'},0^FH_^FD${zplEscape(wrapped.join(' '))}^FS`,
        );
        y += Math.round(h * 1.15) * wrapped.length;
      }
    }
    out.push('^PQ1', '^XZ');
  }
  return { ok: true, filename: `item-labels-${stock.widthMm}x${stock.heightMm}.zpl`, content: out.join('\r\n') + '\r\n' };
}
