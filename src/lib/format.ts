/** Money / date / number helpers shared by server and client. */

export const num = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Rounds to 2dp without floating-point drift. */
export const round2 = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

/** Rounds to 3dp (quantities). */
export const round3 = (v: number): number => Math.round((v + Number.EPSILON) * 1000) / 1000;

const inrFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrCompact = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

/** ₹ 1,23,456.00 */
export function formatCurrency(value: unknown, opts?: { decimals?: boolean; symbol?: boolean }) {
  const n = num(value);
  const decimals = opts?.decimals ?? true;
  const symbol = opts?.symbol ?? true;
  const body = decimals ? inrFormatter.format(n) : inrCompact.format(n);
  return symbol ? `₹ ${body}` : body;
}

/** 1,23,456 — no symbol, no decimals. Used for headline tiles. */
export function formatAmountShort(value: unknown) {
  return `₹ ${inrCompact.format(num(value))}`;
}

export function formatQty(value: unknown) {
  const n = num(value);
  return Number.isInteger(n) ? String(n) : String(round3(n));
}

/** ISO (yyyy-mm-dd) -> dd/mm/yyyy, matching Vyapar's display format. */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? parseISODate(iso) : iso;
  if (!d || Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Parses yyyy-mm-dd as a *local* date so no timezone shifting occurs. */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Date -> yyyy-mm-dd using local time. */
export function toISODate(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = parseISODate(fromIso).getTime();
  const b = parseISODate(toIso).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Named ranges used by every list screen's "Filter by" control. */
export type DateRangeKey =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'last_year'
  | 'all'
  | 'custom';

export const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_quarter: 'This Quarter',
  this_year: 'This Financial Year',
  last_year: 'Last Financial Year',
  all: 'All Time',
  custom: 'Custom',
};

/** Indian financial year starts on 1 April. */
export function financialYearStart(d: Date): Date {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(y, 3, 1);
}

export function resolveDateRange(key: DateRangeKey, today = new Date()): { from: string; to: string } {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  switch (key) {
    case 'today':
      return { from: toISODate(t), to: toISODate(t) };
    case 'yesterday': {
      const y = new Date(t);
      y.setDate(y.getDate() - 1);
      return { from: toISODate(y), to: toISODate(y) };
    }
    case 'this_week': {
      const start = new Date(t);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { from: toISODate(start), to: toISODate(end) };
    }
    case 'this_month': {
      const start = new Date(t.getFullYear(), t.getMonth(), 1);
      const end = new Date(t.getFullYear(), t.getMonth() + 1, 0);
      return { from: toISODate(start), to: toISODate(end) };
    }
    case 'last_month': {
      const start = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      const end = new Date(t.getFullYear(), t.getMonth(), 0);
      return { from: toISODate(start), to: toISODate(end) };
    }
    case 'this_quarter': {
      const q = Math.floor(t.getMonth() / 3);
      const start = new Date(t.getFullYear(), q * 3, 1);
      const end = new Date(t.getFullYear(), q * 3 + 3, 0);
      return { from: toISODate(start), to: toISODate(end) };
    }
    case 'this_year': {
      const start = financialYearStart(t);
      const end = new Date(start.getFullYear() + 1, 2, 31);
      return { from: toISODate(start), to: toISODate(end) };
    }
    case 'last_year': {
      const s = financialYearStart(t);
      const start = new Date(s.getFullYear() - 1, 3, 1);
      const end = new Date(s.getFullYear(), 2, 31);
      return { from: toISODate(start), to: toISODate(end) };
    }
    case 'all':
    default:
      return { from: '1970-01-01', to: '2999-12-31' };
  }
}

/** "One Thousand Two Hundred Rupees only" — used on printed invoices. */
export function amountInWords(value: number): string {
  const n = Math.floor(Math.abs(round2(value)));
  const paise = Math.round((Math.abs(round2(value)) - n) * 100);
  if (n === 0 && paise === 0) return 'Zero Rupees only';

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const twoDigits = (x: number): string =>
    x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? ' ' + ones[x % 10] : ''}`;

  const threeDigits = (x: number): string => {
    const h = Math.floor(x / 100);
    const rest = x % 100;
    return `${h ? ones[h] + ' Hundred' : ''}${h && rest ? ' ' : ''}${rest ? twoDigits(rest) : ''}`;
  };

  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const hundred = n % 1000;

  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  let words = parts.join(' ').trim() + ' Rupees';
  if (paise) words += ` and ${twoDigits(paise)} Paise`;
  return words + ' only';
}

/** Loose GSTIN shape check — 2 digit state, 10 char PAN, entity, Z, checksum. */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGSTIN(v: string): boolean {
  return GSTIN_REGEX.test(v.trim().toUpperCase());
}
