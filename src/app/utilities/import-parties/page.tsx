'use client';

import { ImportScreen } from '@/components/utilities/ImportScreen';

export default function Page() {
  return (
    <ImportScreen
      kind="parties"
      title="Import Parties"
      description="Bring your customers and suppliers in from a spreadsheet or contacts export."
      sampleColumns={[
        'Party Name',
        'Phone',
        'Email',
        'GSTIN',
        'Party Type',
        'Address',
        'State',
        'Group',
        'Opening Balance',
        'Balance Type',
      ]}
      sampleRow={{
        'Party Name': 'Sharma Traders',
        Phone: '9876543210',
        Email: 'accounts@sharmatraders.in',
        GSTIN: '24AAAAA0000A1Z5',
        'Party Type': 'Customer',
        Address: '12 MG Road, Ahmedabad',
        State: 'Gujarat',
        Group: 'General',
        'Opening Balance': '5000',
        'Balance Type': 'To Receive',
      }}
    />
  );
}
