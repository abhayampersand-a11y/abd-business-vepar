'use client';

import { TransactionListScreen } from '@/components/txn/TransactionListScreen';

export default function Page() {
  return (
    <TransactionListScreen
      types={['delivery_challan']}
      title="Delivery Challan"
      addLabel="Add Delivery Challan"
    />
  );
}
