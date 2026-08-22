'use client';

import { TransactionListScreen } from '@/components/txn/TransactionListScreen';

export default function Page() {
  return (
    <TransactionListScreen
      types={['credit_note']}
      title="Sale Return/ Credit Note"
      addLabel="Add Credit Note"
      showStatusFilter
    />
  );
}
