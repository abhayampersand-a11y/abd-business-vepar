'use client';

import { TransactionListScreen } from '@/components/txn/TransactionListScreen';

export default function Page() {
  return (
    <TransactionListScreen
      types={['party_to_party_received', 'party_to_party_paid']}
      title="Party to Party Transfers"
      addLabel="Add Transfer"
      emptyTitle="No transfers recorded"
      emptyDescription="Move a balance from one party to another without cash changing hands."
    />
  );
}
