'use client';

import { TransactionListScreen } from '@/components/txn/TransactionListScreen';

export default function Page() {
  return (
    <TransactionListScreen
      types={['sale_order']}
      title="Sale Orders"
      addLabel="Add Sale Order"
      showStatusFilter
    />
  );
}
