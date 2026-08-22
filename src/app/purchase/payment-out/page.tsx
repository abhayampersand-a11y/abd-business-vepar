'use client';

import { TransactionListScreen } from '@/components/txn/TransactionListScreen';

export default function Page() {
  return (
    <TransactionListScreen
      types={['payment_out']}
      title="Payment-Out"
      addLabel="Add Payment-Out"
    />
  );
}
