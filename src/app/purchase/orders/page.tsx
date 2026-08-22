'use client';

import { TransactionListScreen } from '@/components/txn/TransactionListScreen';

export default function Page() {
  return (
    <TransactionListScreen
      types={['purchase_order']}
      title="Purchase Orders"
      addLabel="Add Purchase Order"
      showStatusFilter
    />
  );
}
