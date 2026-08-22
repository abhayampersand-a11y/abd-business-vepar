'use client';

import { TransactionListScreen } from '@/components/txn/TransactionListScreen';

export default function Page() {
  return (
    <TransactionListScreen
      types={['estimate']}
      title="Estimate/Quotation"
      addLabel="Add Estimate"
    />
  );
}
