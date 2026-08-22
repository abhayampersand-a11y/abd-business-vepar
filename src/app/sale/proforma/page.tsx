'use client';

import { TransactionListScreen } from '@/components/txn/TransactionListScreen';

export default function Page() {
  return (
    <TransactionListScreen
      types={['proforma']}
      title="Proforma Invoice"
      addLabel="Add Proforma"
    />
  );
}
