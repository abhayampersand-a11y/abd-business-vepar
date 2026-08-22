'use client';

import { FileSpreadsheet, Download } from 'lucide-react';
import { useGetItemsQuery, useGetPartiesQuery, useGetTransactionsQuery } from '@/store/api';
import { Button, Card, Spinner } from '@/components/ui';
import { exportRowsToCSV } from '@/lib/export';
import { formatDate, num, resolveDateRange } from '@/lib/format';
import { TXN_META } from '@/lib/constants';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/uiSlice';

export default function ExportPage() {
  const dispatch = useAppDispatch();
  const { data: items = [], isLoading } = useGetItemsQuery();
  const { data: parties = [] } = useGetPartiesQuery();
  const year = resolveDateRange('this_year');
  const { data: txnData } = useGetTransactionsQuery({ from: year.from, to: year.to, limit: 5000 });

  const exportItems = () => {
    exportRowsToCSV(
      'items.csv',
      items.map((i) => ({
        'Item Name': i.name,
        Type: i.type,
        'Item Code': i.itemCode ?? '',
        HSN: i.hsnSac ?? '',
        Category: i.categoryName ?? '',
        Unit: i.unitShort,
        'Sale Price': num(i.salePrice),
        'Purchase Price': num(i.purchasePrice),
        'Tax Rate': num(i.taxRate),
        'Opening Stock': num(i.openingStock),
        'Current Stock': num(i.stockQty),
        'Min Stock': num(i.minStockLevel),
        'Stock Value': num(i.stockQty) * num(i.purchasePrice),
        Location: i.location ?? '',
        Active: i.isActive ? 'Yes' : 'No',
      })),
    );
    dispatch(pushToast(`Exported ${items.length} items`, 'success'));
  };

  const exportParties = () => {
    exportRowsToCSV(
      'parties.csv',
      parties.map((p) => ({
        'Party Name': p.name,
        Phone: p.phone ?? '',
        Email: p.email ?? '',
        GSTIN: p.gstin ?? '',
        'Party Type': p.partyType,
        State: p.state ?? '',
        Group: p.partyGroup ?? '',
        Address: p.billingAddress ?? '',
        'Opening Balance': num(p.openingBalance),
        'Balance Type': p.openingBalanceType === 'to_pay' ? 'To Pay' : 'To Receive',
        'Current Balance': num(p.balance),
      })),
    );
    dispatch(pushToast(`Exported ${parties.length} parties`, 'success'));
  };

  const exportTransactions = () => {
    const rows = txnData?.transactions ?? [];
    exportRowsToCSV(
      'transactions.csv',
      rows.map((t) => ({
        Date: formatDate(t.txnDate),
        Type: TXN_META[t.txnType].label,
        Number: t.txnNo,
        Party: t.partyName ?? '',
        'Payment Type': t.paymentType,
        Subtotal: num(t.subtotal),
        Discount: num(t.discountAmount),
        Tax: num(t.taxAmount),
        Total: num(t.totalAmount),
        Received: num(t.receivedAmount) + num(t.settledAmount),
        Balance: num(t.balanceAmount),
        'Due Date': formatDate(t.dueDate),
        Status: t.status,
      })),
    );
    dispatch(pushToast(`Exported ${rows.length} transactions`, 'success'));
  };

  if (isLoading) return <Spinner />;

  const cards = [
    {
      title: 'Items',
      count: items.length,
      body: 'Every product and service with prices, stock and tax rate.',
      onClick: exportItems,
    },
    {
      title: 'Parties',
      count: parties.length,
      body: 'Customers and suppliers with contact details and balances.',
      onClick: exportParties,
    },
    {
      title: 'Transactions',
      count: txnData?.transactions.length ?? 0,
      body: 'This financial year, every document with its totals and status.',
      onClick: exportTransactions,
    },
  ];

  return (
    <div className="p-5">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <FileSpreadsheet size={19} className="text-success" />
        Export Data
      </h1>
      <p className="mt-0.5 text-[13px] text-ink-soft">
        Download your data as CSV — opens directly in Excel or Google Sheets.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.title}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[14.5px] font-semibold text-ink">{c.title}</h2>
              <span className="text-[13px] text-ink-faint">{c.count} records</span>
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{c.body}</p>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              className="mt-3 w-full"
              onClick={c.onClick}
              disabled={!c.count}
            >
              Download CSV
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
