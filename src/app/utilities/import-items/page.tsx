'use client';

import { ImportScreen } from '@/components/utilities/ImportScreen';

export default function Page() {
  return (
    <ImportScreen
      kind="items"
      title="Import Items"
      description="Bring your product and service list in from a spreadsheet."
      sampleColumns={[
        'Item Name',
        'Item Code',
        'HSN',
        'Category',
        'Unit',
        'Sale Price',
        'Purchase Price',
        'Tax Rate',
        'Opening Stock',
        'Min Stock',
        'Location',
      ]}
      sampleRow={{
        'Item Name': 'Cotton T-Shirt',
        'Item Code': 'TS-001',
        HSN: '6109',
        Category: 'Garments',
        Unit: 'Pcs',
        'Sale Price': '499',
        'Purchase Price': '320',
        'Tax Rate': '5',
        'Opening Stock': '25',
        'Min Stock': '5',
        Location: 'Rack A1',
      }}
    />
  );
}
