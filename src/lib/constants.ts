import type { TxnType } from '@/db/schema';

/** Everything the UI needs to know about a document type, in one place. */
export type TxnMeta = {
  type: TxnType;
  label: string;
  plural: string;
  /** Route segment under /dashboard */
  route: string;
  /** Does this document move stock? */
  affectsStock: 'in' | 'out' | null;
  /** Direction of money against the party. +1 => increases receivable. */
  partySign: number;
  /** Does it have line items? */
  hasItems: boolean;
  /** Money direction for cash/bank: +1 in, -1 out, 0 none. */
  cashSign: number;
  /** Short prefix used on printed documents. */
  prefix: string;
};

export const TXN_META: Record<TxnType, TxnMeta> = {
  sale: {
    type: 'sale',
    label: 'Sale Invoice',
    plural: 'Sale Invoices',
    route: 'sale/invoices',
    affectsStock: 'out',
    partySign: 1,
    hasItems: true,
    cashSign: 1,
    prefix: 'INV',
  },
  purchase: {
    type: 'purchase',
    label: 'Purchase Bill',
    plural: 'Purchase Bills',
    route: 'purchase/bills',
    affectsStock: 'in',
    partySign: -1,
    hasItems: true,
    cashSign: -1,
    prefix: 'PUR',
  },
  payment_in: {
    type: 'payment_in',
    label: 'Payment-In',
    plural: 'Payment-In',
    route: 'sale/payment-in',
    affectsStock: null,
    partySign: -1,
    hasItems: false,
    cashSign: 1,
    prefix: 'PMT',
  },
  payment_out: {
    type: 'payment_out',
    label: 'Payment-Out',
    plural: 'Payment-Out',
    route: 'purchase/payment-out',
    affectsStock: null,
    partySign: 1,
    hasItems: false,
    cashSign: -1,
    prefix: 'PMO',
  },
  credit_note: {
    type: 'credit_note',
    label: 'Credit Note',
    plural: 'Sale Return / Credit Note',
    route: 'sale/credit-notes',
    affectsStock: 'in',
    partySign: -1,
    hasItems: true,
    cashSign: -1,
    prefix: 'CN',
  },
  debit_note: {
    type: 'debit_note',
    label: 'Debit Note',
    plural: 'Purchase Return / Debit Note',
    route: 'purchase/debit-notes',
    affectsStock: 'out',
    partySign: 1,
    hasItems: true,
    cashSign: 1,
    prefix: 'DN',
  },
  sale_order: {
    type: 'sale_order',
    label: 'Sale Order',
    plural: 'Sale Orders',
    route: 'sale/orders',
    affectsStock: null,
    partySign: 0,
    hasItems: true,
    cashSign: 0,
    prefix: 'SO',
  },
  purchase_order: {
    type: 'purchase_order',
    label: 'Purchase Order',
    plural: 'Purchase Orders',
    route: 'purchase/orders',
    affectsStock: null,
    partySign: 0,
    hasItems: true,
    cashSign: 0,
    prefix: 'PO',
  },
  estimate: {
    type: 'estimate',
    label: 'Estimate',
    plural: 'Estimate / Quotation',
    route: 'sale/estimates',
    affectsStock: null,
    partySign: 0,
    hasItems: true,
    cashSign: 0,
    prefix: 'EST',
  },
  proforma: {
    type: 'proforma',
    label: 'Proforma Invoice',
    plural: 'Proforma Invoices',
    route: 'sale/proforma',
    affectsStock: null,
    partySign: 0,
    hasItems: true,
    cashSign: 0,
    prefix: 'PI',
  },
  delivery_challan: {
    type: 'delivery_challan',
    label: 'Delivery Challan',
    plural: 'Delivery Challans',
    route: 'sale/delivery-challan',
    affectsStock: null,
    partySign: 0,
    hasItems: true,
    cashSign: 0,
    prefix: 'DC',
  },
  expense: {
    type: 'expense',
    label: 'Expense',
    plural: 'Expenses',
    route: 'purchase/expenses',
    affectsStock: null,
    partySign: -1,
    hasItems: true,
    cashSign: -1,
    prefix: 'EXP',
  },
  party_to_party_received: {
    type: 'party_to_party_received',
    label: 'Party to Party (Received)',
    plural: 'Party to Party (Received)',
    route: 'accounting/party-to-party',
    affectsStock: null,
    partySign: -1,
    hasItems: false,
    cashSign: 0,
    prefix: 'P2PR',
  },
  party_to_party_paid: {
    type: 'party_to_party_paid',
    label: 'Party to Party (Paid)',
    plural: 'Party to Party (Paid)',
    route: 'accounting/party-to-party',
    affectsStock: null,
    partySign: 1,
    hasItems: false,
    cashSign: 0,
    prefix: 'P2PP',
  },
  journal_entry: {
    type: 'journal_entry',
    label: 'Journal Entry',
    plural: 'Journal Entries',
    route: 'accounting/journal',
    affectsStock: null,
    partySign: 0,
    hasItems: false,
    cashSign: 0,
    prefix: 'JV',
  },
  sale_cancelled: {
    type: 'sale_cancelled',
    label: 'Sale (Cancelled)',
    plural: 'Cancelled Sales',
    route: 'sale/invoices',
    affectsStock: null,
    partySign: 0,
    hasItems: true,
    cashSign: 0,
    prefix: 'INV',
  },
};

export const ALL_TXN_TYPES = Object.keys(TXN_META) as TxnType[];

export const PAYMENT_TYPES = ['Cash', 'Cheque', 'Bank Account', 'UPI', 'Card', 'NEFT/RTGS'] as const;

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;

export const DEFAULT_UNITS: Array<{ name: string; shortName: string }> = [
  { name: 'Pieces', shortName: 'Pcs' },
  { name: 'Bags', shortName: 'Bag' },
  { name: 'Bottles', shortName: 'Btl' },
  { name: 'Box', shortName: 'Box' },
  { name: 'Bundles', shortName: 'Bdl' },
  { name: 'Cartons', shortName: 'Ctn' },
  { name: 'Dozens', shortName: 'Dzn' },
  { name: 'Grammes', shortName: 'Gm' },
  { name: 'Kilograms', shortName: 'Kg' },
  { name: 'Litre', shortName: 'Ltr' },
  { name: 'Meters', shortName: 'Mtr' },
  { name: 'Numbers', shortName: 'Nos' },
  { name: 'Packs', shortName: 'Pac' },
  { name: 'Pairs', shortName: 'Prs' },
  { name: 'Quintal', shortName: 'Qtl' },
  { name: 'Rolls', shortName: 'Rol' },
  { name: 'Square Feet', shortName: 'Sqf' },
  { name: 'Tablets', shortName: 'Tbs' },
];

export const INDIAN_STATES = [
  'Andaman & Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra & Nagar Haveli & Daman & Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const BUSINESS_CATEGORIES = [
  'Retail',
  'Wholesale / Distributor',
  'Manufacturing',
  'Services',
  'Grocery',
  'Electronics',
  'Garments & Apparel',
  'Pharmacy',
  'Restaurant / Cafe',
  'Hardware',
  'Jewellery',
  'Automobile',
  'Other',
];

export const BUSINESS_TYPES = [
  'Proprietorship',
  'Partnership',
  'Private Limited',
  'Public Limited',
  'LLP',
  'HUF',
  'Other',
];

export const DEFAULT_EXPENSE_CATEGORIES: Array<{ name: string; type: 'direct' | 'indirect' }> = [
  { name: 'Rent', type: 'indirect' },
  { name: 'Salary', type: 'indirect' },
  { name: 'Transport', type: 'direct' },
  { name: 'Petrol', type: 'direct' },
  { name: 'Tea', type: 'indirect' },
];
