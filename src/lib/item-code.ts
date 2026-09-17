/**
 * Item codes and the QR labels built on them. Shared by the API, the entry
 * form and the label printer, so a scanned label always resolves the same way.
 *
 * A label's QR holds a URL (`<origin>/i/<code>`), not the price: a phone camera
 * opens it straight into the item, a USB scanner types it into the invoice's
 * scan box, and a price change never makes a printed label wrong.
 */

export const ITEM_QR_PATH = '/i/';

export const normalizeItemCode = (code: string | null | undefined) => (code ?? '').trim();

/** The code an item gets when none is typed: ITM00042. */
export const autoItemCode = (id: number) => `ITM${String(id).padStart(5, '0')}`;

export const sameItemCode = (a: string | null | undefined, b: string) =>
  normalizeItemCode(a).toLowerCase() === normalizeItemCode(b).toLowerCase();

/**
 * Origin printed into labels. Set NEXT_PUBLIC_APP_URL when labels are printed
 * from a machine whose address a phone cannot reach (localhost, a LAN IP).
 */
export function appOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '');
  if (configured) return configured;
  return typeof window === 'undefined' ? '' : window.location.origin;
}

export const itemQrUrl = (code: string) =>
  `${appOrigin()}${ITEM_QR_PATH}${encodeURIComponent(normalizeItemCode(code))}`;

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** Reads what a scanner produced — a bare barcode or a label URL — back into an item code. */
export function codeFromScan(text: string): string {
  const raw = text.trim();
  if (!/^https?:\/\//i.test(raw)) return raw;
  try {
    const { pathname } = new URL(raw);
    if (pathname.startsWith(ITEM_QR_PATH)) {
      return normalizeItemCode(safeDecode(pathname.slice(ITEM_QR_PATH.length)));
    }
  } catch {
    // Not a URL after all; treat it as a code.
  }
  return raw;
}

/** The `[code]` route segment, which may or may not arrive still percent-encoded. */
export const codeFromRouteParam = (param: string) => normalizeItemCode(safeDecode(param));
