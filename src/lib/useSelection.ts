'use client';

import { useState } from 'react';

/**
 * Master-detail selection that always resolves to a real row.
 *
 * The fallback to the first row is derived during render rather than pushed in
 * from an effect, so the detail pane never flashes empty and the list never
 * renders twice.
 */
export function useSelection<T>(
  rows: T[],
  getId: (row: T) => number,
): [number | null, (id: number | null) => void] {
  const [picked, setPicked] = useState<number | null>(null);

  const stillPresent = picked !== null && rows.some((r) => getId(r) === picked);
  const selectedId = stillPresent ? picked : (rows.length ? getId(rows[0]) : null);

  return [selectedId, setPicked];
}
