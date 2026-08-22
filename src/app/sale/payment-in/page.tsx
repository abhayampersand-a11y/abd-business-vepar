'use client';

import { TransactionListScreen } from '@/components/txn/TransactionListScreen';

export default function Page() {
  return (
    <TransactionListScreen
      types={['payment_in']}
      title="Payment-In"
      addLabel="Add Payment-In"
    />
  );
}
