import { encode } from 'uqr';

/** Modules of white margin a scanner needs around the code. */
export const QUIET_ZONE = 2;

/**
 * Error correction. M (15%) survives a scuffed label and is the default; L
 * gives fewer, larger modules for very small labels; Q suits rough handling.
 */
export type QrEcc = 'L' | 'M' | 'Q';

/**
 * Square QR as a single SVG path in module units. Runs of dark modules on a
 * row are merged, so a label is one small, crisp shape at any print size.
 */
export function qrPath(text: string, ecc: QrEcc = 'M'): { size: number; d: string } {
  const { size, data } = encode(text, { ecc, border: 0 });
  let d = '';
  data.forEach((row, y) => {
    let x = 0;
    while (x < size) {
      if (!row[x]) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < size && row[x + run]) run++;
      d += `M${x} ${y}h${run}v1h-${run}z`;
      x += run;
    }
  });
  return { size, d };
}

/** Modules across the code, quiet zone included. */
export function qrTotalModules(text: string, ecc: QrEcc = 'M') {
  return encode(text, { ecc, border: 0 }).size + QUIET_ZONE * 2;
}

/** A reusable `<symbol>` so a sheet of identical labels carries each QR once. */
export function qrSymbolMarkup(id: string, text: string, ecc: QrEcc = 'M'): string {
  const { size, d } = qrPath(text, ecc);
  const full = size + QUIET_ZONE * 2;
  return (
    `<symbol id="${id}" viewBox="${-QUIET_ZONE} ${-QUIET_ZONE} ${full} ${full}">` +
    `<rect x="${-QUIET_ZONE}" y="${-QUIET_ZONE}" width="${full}" height="${full}" fill="#fff"/>` +
    `<path d="${d}" fill="#000"/></symbol>`
  );
}

/** PNG of the QR, for downloading and sharing. */
export function qrPngDataUrl(text: string, pixels = 720): string {
  const { size, data } = encode(text, { ecc: 'M', border: QUIET_ZONE });
  const scale = Math.max(1, Math.floor(pixels / size));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) ctx.fillRect(x * scale, y * scale, scale, scale);
    }),
  );
  return canvas.toDataURL('image/png');
}
