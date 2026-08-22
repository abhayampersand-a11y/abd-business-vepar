'use client';

import { use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TransactionForm } from '@/components/txn/TransactionForm';
import { Spinner } from '@/components/ui';
import { useGetTransactionQuery } from '@/store/api';
import { TXN_META } from '@/lib/constants';
import type { TxnType } from '@/types';

export default function NewTransactionPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);

  if (!(type in TXN_META)) {
    return (
      <div className="p-10 text-center text-[14px] text-ink-soft">
        Unknown document type &ldquo;{type}&rdquo;.
      </div>
    );
  }

  return (
    <Suspense fallback={<Spinner />}>
      <NewTransactionInner type={type as TxnType} />
    </Suspense>
  );
}

function NewTransactionInner({ type }: { type: TxnType }) {
  const params = useSearchParams();

  const numberOrUndefined = (key: string) => {
    const v = params.get(key);
    return v ? Number(v) : undefined;
  };

  const duplicateId = numberOrUndefined('duplicate');
  const convertId = numberOrUndefined('convert');
  const sourceId = duplicateId ?? convertId;

  // The document being copied is loaded here so the form can build its initial
  // state on mount rather than filling itself in after the fact.
  const { data: source, isLoading } = useGetTransactionQuery(sourceId!, { skip: !sourceId });

  if (sourceId && isLoading) return <Spinner label="Loading document…" />;

  return (
    <TransactionForm
      key={source?.id ?? 'new'}
      txnType={type}
      source={source}
      convertId={convertId}
      presetPartyId={numberOrUndefined('partyId')}
    />
  );
}
