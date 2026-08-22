'use client';

import { TransactionListScreen } from '@/components/txn/TransactionListScreen';

export default function Page() {
  return (
    <TransactionListScreen
      types={['debit_note']}
      title="Purchase Return/ Dr. Note"
      addLabel="Add Debit Note"
      showStatusFilter
    />
  );
}
