'use client';

import { TransactionListScreen } from '@/components/txn/TransactionListScreen';

export default function Page() {
  return (
    <TransactionListScreen
      types={['sale']}
      title="Sale Invoices"
      addLabel="Add Sale"
    />
  );
}
