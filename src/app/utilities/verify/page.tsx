'use client';

import { useState } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useRecalculateMutation } from '@/store/api';
import { Button, Card } from '@/components/ui';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';

export default function VerifyDataPage() {
  const dispatch = useAppDispatch();
  const [recalculate, { isLoading }] = useRecalculateMutation();
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    try {
      const res = await recalculate().unwrap();
      setResult(res.message);
      dispatch(pushToast('Data verified and rebuilt', 'success'));
    } catch {
      dispatch(pushToast('Verification failed', 'error'));
    }
  };

  return (
    <div className="p-5">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <ShieldCheck size={19} className="text-accent" />
        Verify My Data
      </h1>
      <p className="mt-0.5 text-[13px] text-ink-soft">
        Rebuilds every party balance and stock quantity from the underlying transactions.
      </p>

      <Card className="mt-4 max-w-2xl">
        <h2 className="text-[14px] font-semibold text-ink">What this does</h2>
        <ul className="mt-2 space-y-1.5 text-[13px] text-ink-soft">
          <li>• Recomputes each party&apos;s balance from their opening balance and every document.</li>
          <li>• Recomputes each item&apos;s stock from its opening quantity, sales, purchases, returns and manual adjustments.</li>
          <li>• Leaves your transactions untouched — only the running totals are rewritten.</li>
        </ul>
        <p className="mt-3 text-[12.5px] text-ink-faint">
          Safe to run at any time. Useful after importing data or if a balance ever looks wrong.
        </p>

        <Button
          className="mt-4"
          icon={<RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />}
          onClick={run}
          loading={isLoading}
        >
          Verify & Rebuild
        </Button>

        {result && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-success-soft px-4 py-3 text-[13px] text-success">
            <CheckCircle2 size={16} />
            {result}
          </p>
        )}
      </Card>
    </div>
  );
}
