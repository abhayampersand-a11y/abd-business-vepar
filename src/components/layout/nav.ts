import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Users,
  ShoppingBag,
  FileText,
  ShoppingCart,
  TrendingUp,
  Landmark,
  UserCog,
  BarChart3,
  RefreshCw,
  Wrench,
  Settings,
  BadgeIndianRupee,
} from 'lucide-react';

export type NavChild = {
  label: string;
  href: string;
  /** Renders the little crown badge Vyapar puts on premium features. */
  premium?: boolean;
  /** Shows the "+" quick-add affordance on the row. */
  quickAdd?: string;
};

export type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  quickAdd?: string;
  children?: NavChild[];
};

export const NAV: NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  {
    label: 'Parties',
    icon: Users,
    children: [
      { label: 'Party Details', href: '/parties', quickAdd: '/parties?new=1' },
      { label: 'Whatsapp Connect', href: '/parties/whatsapp', premium: true },
      { label: 'Vyapar Network', href: '/parties/network', premium: true },
    ],
  },
  { label: 'Items', href: '/items', icon: ShoppingBag, quickAdd: '/items?new=1' },
  {
    label: 'Sale',
    icon: FileText,
    children: [
      { label: 'Sale Invoices', href: '/sale/invoices', quickAdd: '/txn/new/sale' },
      { label: 'Estimate/ Quotation', href: '/sale/estimates', quickAdd: '/txn/new/estimate' },
      { label: 'Proforma Invoice', href: '/sale/proforma', quickAdd: '/txn/new/proforma' },
      { label: 'Payment-In', href: '/sale/payment-in', quickAdd: '/txn/new/payment_in' },
      { label: 'Sale Order', href: '/sale/orders', quickAdd: '/txn/new/sale_order' },
      {
        label: 'Delivery Challan',
        href: '/sale/delivery-challan',
        quickAdd: '/txn/new/delivery_challan',
      },
      {
        label: 'Sale Return/ Credit Note',
        href: '/sale/credit-notes',
        quickAdd: '/txn/new/credit_note',
      },
      { label: 'Vyapar POS', href: '/sale/pos', premium: true },
    ],
  },
  {
    label: 'Purchase & Expense',
    icon: ShoppingCart,
    children: [
      { label: 'Purchase Bills', href: '/purchase/bills', quickAdd: '/txn/new/purchase' },
      { label: 'Payment-Out', href: '/purchase/payment-out', quickAdd: '/txn/new/payment_out' },
      { label: 'Expenses', href: '/purchase/expenses', quickAdd: '/txn/new/expense' },
      { label: 'Purchase Order', href: '/purchase/orders', quickAdd: '/txn/new/purchase_order' },
      {
        label: 'Purchase Return/ Dr. Note',
        href: '/purchase/debit-notes',
        quickAdd: '/txn/new/debit_note',
      },
    ],
  },
  { label: 'Grow Your Business', href: '/grow', icon: TrendingUp },
  {
    label: 'Cash & Bank',
    icon: Landmark,
    children: [
      { label: 'Bank Accounts', href: '/cash-bank/bank-accounts', quickAdd: '/cash-bank/bank-accounts?new=1' },
      { label: 'Cash In Hand', href: '/cash-bank/cash-in-hand', quickAdd: '/cash-bank/cash-in-hand?adjust=1' },
      { label: 'Cheques', href: '/cash-bank/cheques' },
      { label: 'Loan Accounts', href: '/cash-bank/loans', quickAdd: '/cash-bank/loans?new=1' },
    ],
  },
  {
    label: 'Accounting',
    icon: UserCog,
    children: [
      { label: 'Journal Entry', href: '/accounting/journal' },
      { label: 'Party to Party', href: '/accounting/party-to-party' },
    ],
  },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  {
    label: 'Sync, Share & Backup',
    icon: RefreshCw,
    children: [
      { label: 'Auto Backup', href: '/sync/backup' },
      { label: 'Backup to Computer', href: '/sync/backup' },
      { label: 'Restore Backup', href: '/sync/restore' },
    ],
  },
  {
    label: 'Utilities',
    icon: Wrench,
    children: [
      { label: 'Import Items', href: '/utilities/import-items' },
      { label: 'Set Up My Business', href: '/utilities/setup' },
      { label: 'Accountant Access', href: '/utilities/accountant' },
      { label: 'Barcode Generator', href: '/utilities/barcode', premium: true },
      { label: 'Update Items In Bulk', href: '/utilities/bulk-update', premium: true },
      { label: 'Import From Tally', href: '/utilities/import-tally', premium: true },
      { label: 'Import Parties', href: '/utilities/import-parties' },
      { label: 'Track Your Salesmen', href: '/utilities/salesmen', premium: true },
      { label: 'Exports To Tally', href: '/utilities/export-tally', premium: true },
      { label: 'Export Items', href: '/utilities/export-items' },
      { label: 'Verify My Data', href: '/utilities/verify' },
      { label: 'Close Financial Year', href: '/utilities/close-year' },
    ],
  },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Plans & Pricing', href: '/plans', icon: BadgeIndianRupee },
];
