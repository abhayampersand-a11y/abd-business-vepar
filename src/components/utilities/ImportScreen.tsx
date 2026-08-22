'use client';

import { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Card, Spinner } from '@/components/ui';
import { parseCSV, readFileAsText, type CSVRow } from '@/lib/csv';
import { exportRowsToCSV } from '@/lib/export';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';
import { api } from '@/store/api';

type ImportResult = {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

/** Shared CSV import flow for items and parties. */
export function ImportScreen({
  kind,
  title,
  description,
  sampleColumns,
  sampleRow,
}: {
  kind: 'items' | 'parties';
  title: string;
  description: string;
  sampleColumns: string[];
  sampleRow: Record<string, string>;
}) {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<CSVRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onFile = async (file: File) => {
    try {
      const text = await readFileAsText(file);
      const parsed = parseCSV(text);
      if (!parsed.length) {
        dispatch(pushToast('That file has no data rows', 'error'));
        return;
      }
      setRows(parsed);
      setFileName(file.name);
      setResult(null);
    } catch {
      dispatch(pushToast('Could not read that file', 'error'));
    }
  };

  const runImport = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        dispatch(pushToast(data.error ?? 'Import failed', 'error'));
        setResult(data.errors ? { imported: 0, skipped: rows.length, errors: data.errors } : null);
        return;
      }
      setResult(data);
      dispatch(pushToast(`Imported ${data.imported} ${kind}`, 'success'));
      // Anything could have changed — let RTK Query refetch what is on screen.
      dispatch(api.util.invalidateTags(['Item', 'Party', 'Dashboard', 'Report', 'Bootstrap']));
    } catch {
      dispatch(pushToast('Import failed', 'error'));
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () => {
    exportRowsToCSV(`${kind}-import-template.csv`, [sampleRow]);
  };

  const preview = rows.slice(0, 8);
  const headers = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div className="p-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">{description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card padded={false}>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) onFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed border-line-strong px-6 py-12 text-center transition hover:border-accent hover:bg-accent-soft/30"
          >
            <UploadCloud size={38} className="text-accent" />
            <div>
              <p className="text-[14px] font-medium text-ink">
                Drop a CSV here, or click to choose a file
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                Export your spreadsheet as CSV first — column names are matched loosely.
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
                e.target.value = '';
              }}
            />
          </div>

          {rows.length > 0 && (
            <div className="border-t border-line">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <p className="flex items-center gap-2 text-[13px] text-ink">
                  <FileSpreadsheet size={15} className="text-success" />
                  <span className="font-medium">{fileName}</span>
                  <span className="text-ink-faint">
                    · {rows.length} row{rows.length === 1 ? '' : 's'}
                  </span>
                </p>
                <Button onClick={runImport} loading={busy} size="sm">
                  Import {rows.length} {kind}
                </Button>
              </div>

              <div className="overflow-x-auto border-t border-line">
                <table className="w-full min-w-max text-[12.5px]">
                  <thead className="bg-canvas text-ink-soft">
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-t border-line">
                        {headers.map((h) => (
                          <td key={h} className="px-3 py-1.5 text-ink">
                            {r[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > preview.length && (
                <p className="px-4 py-2 text-[12px] text-ink-faint">
                  Showing the first {preview.length} of {rows.length} rows.
                </p>
              )}
            </div>
          )}

          {busy && <Spinner label="Importing…" />}

          {result && (
            <div className="border-t border-line p-4">
              <p className="flex items-center gap-2 text-[13.5px] font-medium text-success">
                <CheckCircle2 size={16} />
                Imported {result.imported} record{result.imported === 1 ? '' : 's'}
              </p>
              {result.skipped > 0 && (
                <>
                  <p className="mt-2 flex items-center gap-2 text-[13px] font-medium text-warning">
                    <AlertCircle size={15} />
                    {result.skipped} row{result.skipped === 1 ? '' : 's'} skipped
                  </p>
                  <ul className="mt-1.5 max-h-40 overflow-y-auto text-[12.5px] text-ink-soft">
                    {result.errors.map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-[14px] font-semibold text-ink">Expected columns</h2>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            Only the first column is required. Everything else is optional.
          </p>
          <ul className="mt-3 space-y-1.5">
            {sampleColumns.map((c, i) => (
              <li key={c} className="flex items-start gap-2 text-[12.5px] text-ink">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>
                  {c}
                  {i === 0 && <span className="text-brand"> (required)</span>}
                </span>
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            className="mt-4 w-full"
            onClick={downloadTemplate}
          >
            Download template
          </Button>
        </Card>
      </div>
    </div>
  );
}
