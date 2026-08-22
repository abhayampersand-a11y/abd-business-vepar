'use client';

import { use } from 'react';
import { TransactionForm } from '@/components/txn/TransactionForm';
import { Spinner } from '@/components/ui';
import { useGetTransactionQuery } from '@/store/api';

export default function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const txnId = Number(id);
  const { data, isLoading } = useGetTransactionQuery(txnId);

  if (isLoading || !data) return <Spinner label="Loading transaction…" />;

  // Keyed on the document so switching between two edits rebuilds the form.
  return <TransactionForm key={data.id} txnType={data.txnType} editId={txnId} source={data} />;
}
