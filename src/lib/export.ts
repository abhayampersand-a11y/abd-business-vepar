/** Client-side CSV export — Excel opens these directly. */

type Row = Record<string, string | number | null | undefined>;

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: Row[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(',')),
  ];
  return lines.join('\n');
}

export function exportRowsToCSV(filename: string, rows: Row[]) {
  if (!rows.length) return;
  // The BOM keeps Excel from mangling ₹ and other non-ASCII characters.
  const blob = new Blob(['﻿' + toCSV(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
