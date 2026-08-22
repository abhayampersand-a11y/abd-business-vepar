'use client';

import { TransactionListScreen } from '@/components/txn/TransactionListScreen';

export default function Page() {
  return (
    <TransactionListScreen
      types={['journal_entry']}
      title="Journal Entries"
      addLabel="Add Journal Entry"
      emptyTitle="No journal entries"
      emptyDescription="Record adjustments that do not fit a sale, purchase or payment."
    />
  );
}
