import { itemQrUrl } from './item-code';
import { qrSymbolMarkup, qrTotalModules } from './qr';
import type { LabelConfig } from './label-stock';
import { pageSize } from './label-stock';
import {
  LINE_HEIGHT,
  LINE_SCALE,
  assessLabels,
  computeGeometry,
  fitQr,
  paginate,
  type LabelGeometry,
  type TextLine,
} from './label-layout';

export type LabelItem = { name: string; itemCode: string; price: string };

export const qrTextFor = (item: LabelItem, config: LabelConfig) =>
  config.qrContent === 'code' ? item.itemCode : itemQrUrl(item.itemCode);

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const n = (v: number) => Math.round(v * 1000) / 1000;

/** Geometry plus checks for a set of labels, as the print panel shows them. */
export function planLabels(labels: LabelItem[], config: LabelConfig) {
  const geometry = computeGeometry(config.stock, config.content);
  // Size warnings against the densest QR in the batch; one sample stands in when empty.
  const sample = labels.length ? labels : [{ name: 'Sample item', itemCode: 'ITM00001', price: '' }];
  const modules = { link: 0, code: 0 };
  for (const l of sample) {
    modules.link = Math.max(modules.link, qrTotalModules(itemQrUrl(l.itemCode), config.ecc));
    modules.code = Math.max(modules.code, qrTotalModules(l.itemCode, config.ecc));
  }
  const pages = paginate(labels, config.stock, config.skip);
  return { geometry, warnings: assessLabels(config, geometry, modules), pages };
}

function textMarkup(item: LabelItem, geometry: LabelGeometry, businessName: string) {
  const t = geometry.text;
  if (!t) return '';
  const value: Record<TextLine, string> = {
    business: businessName,
    name: item.name,
    code: item.itemCode,
    price: item.price,
  };
  const lines = t.lines
    .map((line) => {
      const size = n(t.fontMm * LINE_SCALE[line]);
      const clampStyle =
        line === 'name'
          ? `-webkit-line-clamp:${t.nameLines};max-height:${n(size * LINE_HEIGHT * t.nameLines)}mm;`
          : '';
      return `<div class="t ${line}" style="font-size:${size}mm;${clampStyle}">${escape(value[line])}</div>`;
    })
    .join('');
  return (
    `<div class="text ${t.align}" style="left:${n(t.x)}mm;top:${n(t.y)}mm;` +
    `width:${n(t.width)}mm;height:${n(t.height)}mm">${lines}</div>`
  );
}

type Mode = 'print' | 'preview' | 'test';

/**
 * A complete, self-contained HTML document of labels, sized in millimetres with
 * `@page` set to the stock, so the browser print dialog lays out exactly one
 * roll row or one sheet per page.
 *
 * `test` prints one page of numbered outlines with centre marks instead of
 * labels — held against the real stock it shows how far to set the offset.
 */
export function buildLabelDocument(opts: {
  labels: LabelItem[];
  config: LabelConfig;
  businessName?: string;
  mode: Mode;
  /** Preview only renders the first few pages. */
  maxPages?: number;
}) {
  const { config, mode } = opts;
  const { stock } = config;
  const page = pageSize(stock);
  const geometry = computeGeometry(stock, config.content);
  const outlines = mode === 'test' || config.outlines;

  const labels: LabelItem[] =
    mode === 'test'
      ? Array.from({ length: stock.kind === 'sheet' ? stock.columns * stock.rows : stock.columns }, (_, i) => ({
          name: String(i + 1),
          itemCode: '',
          price: '',
        }))
      : opts.labels;

  const allPages = paginate(labels, stock, mode === 'test' ? 0 : config.skip);
  const pages = opts.maxPages ? allPages.slice(0, opts.maxPages) : allPages;

  // Each distinct QR is drawn once and referenced by every label that uses it.
  const symbols = new Map<string, { id: string; modules: number }>();
  if (mode !== 'test') {
    for (const p of pages) {
      for (const { label } of p) {
        const text = qrTextFor(label, config);
        if (!symbols.has(text)) {
          symbols.set(text, { id: `q${symbols.size}`, modules: qrTotalModules(text, config.ecc) });
        }
      }
    }
  }
  const defs = [...symbols.entries()]
    .map(([text, s]) => qrSymbolMarkup(s.id, text, config.ecc))
    .join('');

  const body = pages
    .map((p) => {
      const labelsHtml = p
        .map(({ label, slot }) => {
          const left = n(slot.xMm + config.offsetXMm);
          const top = n(slot.yMm + config.offsetYMm);
          const box = `left:${left}mm;top:${top}mm;width:${n(stock.widthMm)}mm;height:${n(stock.heightMm)}mm`;

          if (mode === 'test') {
            return (
              `<div class="label outline" style="${box}">` +
              `<div class="cross-h"></div><div class="cross-v"></div>` +
              `<div class="test-no">${escape(label.name)}</div>` +
              `<div class="test-size">${n(stock.widthMm)} × ${n(stock.heightMm)} mm</div></div>`
            );
          }

          const text = qrTextFor(label, config);
          const symbol = symbols.get(text)!;
          const fit = fitQr(geometry.qrBox.size, symbol.modules, config.dpi);
          const qrLeft = n(geometry.qrBox.x + (geometry.qrBox.size - fit.sizeMm) / 2);
          const qrTop = n(geometry.qrBox.y + (geometry.qrBox.size - fit.sizeMm) / 2);
          return (
            `<div class="label${outlines ? ' outline' : ''}" style="${box}">` +
            `<svg class="qr" style="left:${qrLeft}mm;top:${qrTop}mm;width:${n(fit.sizeMm)}mm;height:${n(fit.sizeMm)}mm" shape-rendering="crispEdges">` +
            `<use href="#${symbol.id}" width="100%" height="100%"/></svg>` +
            textMarkup(label, geometry, opts.businessName ?? '') +
            `</div>`
          );
        })
        .join('');
      return `<div class="page">${labelsHtml}</div>`;
    })
    .join('');

  const previewCss =
    mode === 'print'
      ? ''
      : `@media screen {
  html { background: #e8ebf0; }
  body { padding: 10px; }
  .page { margin: 0 auto 10px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.18); }
}`;

  // Scales the preview so a page fills the frame, whatever its real size.
  const previewScript =
    mode === 'preview'
      ? `<script>(function(){function fit(){var p=document.querySelector('.page');if(!p)return;document.body.style.zoom=1;var z=Math.min(4,(window.innerWidth-4)/(p.offsetWidth+24));document.body.style.zoom=z;}window.addEventListener('resize',fit);fit();})();</script>`
      : '';

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Item labels</title>
<style>
@page { size: ${n(page.widthMm)}mm ${n(page.heightMm)}mm; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fff; }
body { color: #000; font-family: Arial, 'Noto Sans Gujarati', 'Nirmala UI', system-ui, sans-serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { position: relative; width: ${n(page.widthMm)}mm; height: ${n(page.heightMm)}mm; overflow: hidden;
  break-after: page; page-break-after: always; }
.page:last-child { break-after: auto; page-break-after: auto; }
.label { position: absolute; overflow: hidden; }
.outline { outline: 0.2mm dashed #777; outline-offset: -0.1mm; }
.qr { position: absolute; display: block; }
.text { position: absolute; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
.text.center { text-align: center; }
.text.left { text-align: left; }
.t { line-height: ${LINE_HEIGHT}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.t.name { white-space: normal; display: -webkit-box; -webkit-box-orient: vertical; word-break: break-word; font-weight: 600; }
.t.business { font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
.t.code { font-family: Consolas, 'Courier New', monospace; }
.t.price { font-weight: 700; }
.cross-h, .cross-v { position: absolute; background: #000; }
.cross-h { left: 25%; right: 25%; top: 50%; height: 0.2mm; }
.cross-v { top: 25%; bottom: 25%; left: 50%; width: 0.2mm; }
.test-no { position: absolute; left: 1.5mm; top: 1mm; font-size: 3mm; font-weight: 700; }
.test-size { position: absolute; right: 1.5mm; bottom: 1mm; font-size: 2mm; }
${previewCss}
</style></head>
<body><svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${defs}</defs></svg>${body}${previewScript}</body></html>`;

  return { html, pageCount: allPages.length, shownPages: pages.length };
}

/**
 * Prints an HTML document from a hidden frame — no pop-up to be blocked, and
 * the app's own layout and styles never reach the label.
 */
export function printHtmlDocument(html: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  });
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    setTimeout(() => frame.remove(), 500);
  };
  win.addEventListener('afterprint', cleanup);
  // Give fonts and layout a moment before the dialog snapshots the page.
  setTimeout(() => {
    win.focus();
    win.print();
    // Browsers without afterprint still get cleaned up eventually.
    setTimeout(cleanup, 60_000);
  }, 300);
  return true;
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
