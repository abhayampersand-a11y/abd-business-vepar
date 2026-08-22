/** The report tree shown down the left of every report screen. */

export type ReportLink = {
  label: string;
  slug: string;
  /** Extra query string appended when navigating. */
  query?: string;
  premium?: boolean;
  /** Not yet backed by data — the screen explains what is missing. */
  planned?: boolean;
};

export type ReportGroup = {
  title: string;
  links: ReportLink[];
};

export const REPORT_GROUPS: ReportGroup[] = [
  {
    title: 'Transaction report',
    links: [
      { label: 'Sale', slug: 'all-transactions', query: 'type=sale' },
      { label: 'Purchase', slug: 'all-transactions', query: 'type=purchase' },
      { label: 'Day book', slug: 'day-book' },
      { label: 'All Transactions', slug: 'all-transactions' },
      { label: 'Profit And Loss', slug: 'profit-and-loss' },
      { label: 'Bill Wise Profit', slug: 'bill-wise-profit', premium: true },
      { label: 'Sale Aging', slug: 'sale-aging' },
      { label: 'Cash flow', slug: 'cash-flow' },
      { label: 'Balance Sheet', slug: 'balance-sheet', premium: true },
    ],
  },
  {
    title: 'Party report',
    links: [
      { label: 'Party Statement', slug: 'party-statement' },
      { label: 'All parties', slug: 'all-parties' },
      { label: 'Sale Purchase By Party', slug: 'sale-purchase-by-party' },
      { label: 'Discount Report', slug: 'discount' },
    ],
  },
  {
    title: 'GST reports',
    links: [
      { label: 'GSTR 1', slug: 'gstr-1' },
      { label: 'GSTR 2', slug: 'gstr-2' },
      { label: 'GST Rate Report', slug: 'gst-rate' },
      { label: 'Sale Summary By HSN', slug: 'hsn-summary' },
    ],
  },
  {
    title: 'Item / Stock report',
    links: [
      { label: 'Stock summary', slug: 'stock-summary' },
      { label: 'Item Wise Profit And Loss', slug: 'item-wise-profit' },
      { label: 'Low Stock Summary', slug: 'low-stock' },
      { label: 'Item Detail', slug: 'item-detail' },
    ],
  },
  {
    title: 'Expense report',
    links: [
      { label: 'Expense', slug: 'expense' },
      { label: 'Expense Category Report', slug: 'expense-category' },
    ],
  },
  {
    title: 'Sale / Purchase Order report',
    links: [{ label: 'Sale/ Purchase Orders', slug: 'orders' }],
  },
];

export const ALL_REPORTS = REPORT_GROUPS.flatMap((g) => g.links);

export function reportLabel(slug: string) {
  return ALL_REPORTS.find((r) => r.slug === slug)?.label ?? slug;
}
