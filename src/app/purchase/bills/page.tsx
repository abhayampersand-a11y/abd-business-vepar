'use client';

import { TransactionListScreen } from '@/components/txn/TransactionListScreen';

export default function Page() {
  return (
    <TransactionListScreen
      types={['purchase']}
      title="Purchase Bills"
      addLabel="Add Purchase"
    />
  );
}
