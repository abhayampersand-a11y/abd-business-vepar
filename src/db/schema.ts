import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  boolean,
  numeric,
  timestamp,
  date,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/* ------------------------------------------------------------------ *
 * Enums
 * ------------------------------------------------------------------ */

export const txnTypeEnum = pgEnum('txn_type', [
  'sale',
  'purchase',
  'payment_in',
  'payment_out',
  'credit_note',
  'debit_note',
  'sale_order',
  'purchase_order',
  'estimate',
  'proforma',
  'delivery_challan',
  'expense',
  'party_to_party_received',
  'party_to_party_paid',
  'journal_entry',
  'sale_cancelled',
]);

export const txnStatusEnum = pgEnum('txn_status', [
  'unpaid',
  'partial',
  'paid',
  'overdue',
  'cancelled',
  'open',
  'converted',
  'closed',
]);

export const partyTypeEnum = pgEnum('party_type', ['customer', 'supplier', 'both']);
export const itemTypeEnum = pgEnum('item_type', ['product', 'service']);
export const balanceTypeEnum = pgEnum('balance_type', ['to_receive', 'to_pay']);
export const adjustTypeEnum = pgEnum('adjust_type', ['add', 'reduce']);
export const expenseTypeEnum = pgEnum('expense_type', ['direct', 'indirect']);

/* ------------------------------------------------------------------ *
 * Users (people who sign in — distinct from parties and firms)
 * ------------------------------------------------------------------ */

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    /** Null for accounts that only ever sign in with Google. */
    passwordHash: text('password_hash'),
    /** Google's stable subject id, set once an account is linked. */
    googleId: text('google_id'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('users_email_key').on(t.email),
    uniqueIndex('users_google_id_key').on(t.googleId),
  ],
);

/* ------------------------------------------------------------------ *
 * Firms (a Vyapar "company" / business profile)
 * ------------------------------------------------------------------ */

export const firms = pgTable('firms', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  gstin: text('gstin'),
  businessType: text('business_type'),
  businessCategory: text('business_category'),
  state: text('state'),
  pincode: text('pincode'),
  address: text('address'),
  logoUrl: text('logo_url'),
  signatureUrl: text('signature_url'),
  booksBeginDate: date('books_begin_date'),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/* ------------------------------------------------------------------ *
 * Parties (customers & suppliers)
 * ------------------------------------------------------------------ */

export const parties = pgTable(
  'parties',
  {
    id: serial('id').primaryKey(),
    firmId: integer('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone'),
    email: text('email'),
    gstin: text('gstin'),
    gstType: text('gst_type').default('unregistered'),
    partyType: partyTypeEnum('party_type').default('customer').notNull(),
    billingAddress: text('billing_address'),
    shippingAddress: text('shipping_address'),
    state: text('state'),
    partyGroup: text('party_group').default('General'),
    creditLimit: numeric('credit_limit', { precision: 14, scale: 2 }),
    openingBalance: numeric('opening_balance', { precision: 14, scale: 2 }).default('0').notNull(),
    openingBalanceType: balanceTypeEnum('opening_balance_type').default('to_receive').notNull(),
    openingDate: date('opening_date'),
    /** Denormalised running balance. Positive => party owes us (receivable). */
    balance: numeric('balance', { precision: 14, scale: 2 }).default('0').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('parties_firm_idx').on(t.firmId), index('parties_name_idx').on(t.name)],
);

/* ------------------------------------------------------------------ *
 * Item master data
 * ------------------------------------------------------------------ */

export const units = pgTable('units', {
  id: serial('id').primaryKey(),
  firmId: integer('firm_id')
    .notNull()
    .references(() => firms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
});

export const itemCategories = pgTable('item_categories', {
  id: serial('id').primaryKey(),
  firmId: integer('firm_id')
    .notNull()
    .references(() => firms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
});

export const items = pgTable(
  'items',
  {
    id: serial('id').primaryKey(),
    firmId: integer('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: itemTypeEnum('type').default('product').notNull(),
    itemCode: text('item_code'),
    hsnSac: text('hsn_sac'),
    categoryId: integer('category_id').references(() => itemCategories.id, { onDelete: 'set null' }),
    unitId: integer('unit_id').references(() => units.id, { onDelete: 'set null' }),
    description: text('description'),

    salePrice: numeric('sale_price', { precision: 14, scale: 2 }).default('0').notNull(),
    salePriceTaxInclusive: boolean('sale_price_tax_inclusive').default(false).notNull(),
    purchasePrice: numeric('purchase_price', { precision: 14, scale: 2 }).default('0').notNull(),
    purchasePriceTaxInclusive: boolean('purchase_price_tax_inclusive')
      .default(false)
      .notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('0').notNull(),
    discountType: text('discount_type').default('percent'),
    discountValue: numeric('discount_value', { precision: 14, scale: 2 }).default('0'),

    openingStock: numeric('opening_stock', { precision: 14, scale: 3 }).default('0').notNull(),
    openingStockPrice: numeric('opening_stock_price', { precision: 14, scale: 2 })
      .default('0')
      .notNull(),
    openingStockDate: date('opening_stock_date'),
    /** Denormalised running quantity on hand. */
    stockQty: numeric('stock_qty', { precision: 14, scale: 3 }).default('0').notNull(),
    minStockLevel: numeric('min_stock_level', { precision: 14, scale: 3 }).default('0'),
    location: text('location'),

    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('items_firm_idx').on(t.firmId), index('items_name_idx').on(t.name)],
);

/* ------------------------------------------------------------------ *
 * Banking & cash
 * ------------------------------------------------------------------ */

export const bankAccounts = pgTable('bank_accounts', {
  id: serial('id').primaryKey(),
  firmId: integer('firm_id')
    .notNull()
    .references(() => firms.id, { onDelete: 'cascade' }),
  accountName: text('account_name').notNull(),
  bankName: text('bank_name'),
  accountNumber: text('account_number'),
  ifscCode: text('ifsc_code'),
  upiId: text('upi_id'),
  accountHolderName: text('account_holder_name'),
  openingBalance: numeric('opening_balance', { precision: 14, scale: 2 }).default('0').notNull(),
  asOfDate: date('as_of_date'),
  balance: numeric('balance', { precision: 14, scale: 2 }).default('0').notNull(),
  printUpiQr: boolean('print_upi_qr').default(false).notNull(),
  printBankDetails: boolean('print_bank_details').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cashAdjustments = pgTable('cash_adjustments', {
  id: serial('id').primaryKey(),
  firmId: integer('firm_id')
    .notNull()
    .references(() => firms.id, { onDelete: 'cascade' }),
  type: adjustTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  adjustmentDate: date('adjustment_date').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/* ------------------------------------------------------------------ *
 * Expense categories
 * ------------------------------------------------------------------ */

export const expenseCategories = pgTable('expense_categories', {
  id: serial('id').primaryKey(),
  firmId: integer('firm_id')
    .notNull()
    .references(() => firms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: expenseTypeEnum('type').default('indirect').notNull(),
});

/* ------------------------------------------------------------------ *
 * Transactions — one table drives every document type
 * ------------------------------------------------------------------ */

export const transactions = pgTable(
  'transactions',
  {
    id: serial('id').primaryKey(),
    firmId: integer('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    txnType: txnTypeEnum('txn_type').notNull(),
    txnNo: integer('txn_no').notNull(),
    prefix: text('prefix'),
    partyId: integer('party_id').references(() => parties.id, { onDelete: 'set null' }),
    partyName: text('party_name'),

    txnDate: date('txn_date').notNull(),
    dueDate: date('due_date'),
    refNo: text('ref_no'),

    subtotal: numeric('subtotal', { precision: 14, scale: 2 }).default('0').notNull(),
    discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).default('0').notNull(),
    taxAmount: numeric('tax_amount', { precision: 14, scale: 2 }).default('0').notNull(),
    roundOff: numeric('round_off', { precision: 14, scale: 2 }).default('0').notNull(),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).default('0').notNull(),
    /** Paid on the document itself, at entry time. This is the ledger figure. */
    receivedAmount: numeric('received_amount', { precision: 14, scale: 2 }).default('0').notNull(),
    /**
     * Knocked off later by separate payment documents. Kept apart from
     * `receivedAmount` so a payment is never counted twice against the party:
     * the payment posts its own ledger entry, this only updates the display.
     */
    settledAmount: numeric('settled_amount', { precision: 14, scale: 2 }).default('0').notNull(),
    balanceAmount: numeric('balance_amount', { precision: 14, scale: 2 }).default('0').notNull(),

    paymentType: text('payment_type').default('Cash').notNull(),
    bankAccountId: integer('bank_account_id').references(() => bankAccounts.id, {
      onDelete: 'set null',
    }),
    chequeNo: text('cheque_no'),

    expenseCategoryId: integer('expense_category_id').references(() => expenseCategories.id, {
      onDelete: 'set null',
    }),

    status: txnStatusEnum('status').default('unpaid').notNull(),
    description: text('description'),
    notes: text('notes'),

    /** Links a credit note to its sale, a sale to the estimate it came from, etc. */
    linkedTxnId: integer('linked_txn_id'),
    isConverted: boolean('is_converted').default(false).notNull(),

    transportName: text('transport_name'),
    vehicleNumber: text('vehicle_number'),
    deliveryDate: date('delivery_date'),
    deliveryLocation: text('delivery_location'),
    ewayBillNo: text('eway_bill_no'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('txn_firm_type_idx').on(t.firmId, t.txnType),
    index('txn_party_idx').on(t.partyId),
    index('txn_date_idx').on(t.txnDate),
    uniqueIndex('txn_no_unique').on(t.firmId, t.txnType, t.txnNo),
  ],
);

export const transactionItems = pgTable(
  'transaction_items',
  {
    id: serial('id').primaryKey(),
    txnId: integer('txn_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    itemId: integer('item_id').references(() => items.id, { onDelete: 'set null' }),
    itemName: text('item_name').notNull(),
    hsnSac: text('hsn_sac'),
    quantity: numeric('quantity', { precision: 14, scale: 3 }).default('0').notNull(),
    unit: text('unit').default('Pcs'),
    pricePerUnit: numeric('price_per_unit', { precision: 14, scale: 2 }).default('0').notNull(),
    isTaxInclusive: boolean('is_tax_inclusive').default(false).notNull(),
    discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).default('0').notNull(),
    discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).default('0').notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('0').notNull(),
    taxAmount: numeric('tax_amount', { precision: 14, scale: 2 }).default('0').notNull(),
    total: numeric('total', { precision: 14, scale: 2 }).default('0').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (t) => [index('txn_items_txn_idx').on(t.txnId)],
);

/** Links a payment-in / payment-out / credit note to the invoices it settles. */
export const paymentAllocations = pgTable(
  'payment_allocations',
  {
    id: serial('id').primaryKey(),
    paymentTxnId: integer('payment_txn_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    invoiceTxnId: integer('invoice_txn_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  },
  (t) => [
    index('alloc_payment_idx').on(t.paymentTxnId),
    index('alloc_invoice_idx').on(t.invoiceTxnId),
  ],
);

/* ------------------------------------------------------------------ *
 * Stock adjustments
 * ------------------------------------------------------------------ */

export const stockAdjustments = pgTable('stock_adjustments', {
  id: serial('id').primaryKey(),
  firmId: integer('firm_id')
    .notNull()
    .references(() => firms.id, { onDelete: 'cascade' }),
  itemId: integer('item_id')
    .notNull()
    .references(() => items.id, { onDelete: 'cascade' }),
  type: adjustTypeEnum('type').notNull(),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  atPrice: numeric('at_price', { precision: 14, scale: 2 }).default('0').notNull(),
  adjustmentDate: date('adjustment_date').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/* ------------------------------------------------------------------ *
 * Loans
 * ------------------------------------------------------------------ */

export const loanAccounts = pgTable('loan_accounts', {
  id: serial('id').primaryKey(),
  firmId: integer('firm_id')
    .notNull()
    .references(() => firms.id, { onDelete: 'cascade' }),
  lenderName: text('lender_name').notNull(),
  accountNumber: text('account_number'),
  loanType: text('loan_type'),
  description: text('description'),
  openingBalance: numeric('opening_balance', { precision: 14, scale: 2 }).default('0').notNull(),
  currentBalance: numeric('current_balance', { precision: 14, scale: 2 }).default('0').notNull(),
  interestRate: numeric('interest_rate', { precision: 6, scale: 3 }).default('0').notNull(),
  termMonths: integer('term_months'),
  openingDate: date('opening_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const loanTransactions = pgTable('loan_transactions', {
  id: serial('id').primaryKey(),
  loanId: integer('loan_id')
    .notNull()
    .references(() => loanAccounts.id, { onDelete: 'cascade' }),
  /** emi | interest | charges | processing_fee | increase | decrease */
  type: text('type').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  principal: numeric('principal', { precision: 14, scale: 2 }).default('0').notNull(),
  interest: numeric('interest', { precision: 14, scale: 2 }).default('0').notNull(),
  txnDate: date('txn_date').notNull(),
  paymentType: text('payment_type').default('Cash').notNull(),
  bankAccountId: integer('bank_account_id').references(() => bankAccounts.id, {
    onDelete: 'set null',
  }),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/* ------------------------------------------------------------------ *
 * Key/value settings per firm
 * ------------------------------------------------------------------ */

export const settings = pgTable(
  'settings',
  {
    id: serial('id').primaryKey(),
    firmId: integer('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value'),
  },
  (t) => [uniqueIndex('settings_firm_key_unique').on(t.firmId, t.key)],
);

/* ------------------------------------------------------------------ *
 * Relations
 * ------------------------------------------------------------------ */

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  party: one(parties, { fields: [transactions.partyId], references: [parties.id] }),
  firm: one(firms, { fields: [transactions.firmId], references: [firms.id] }),
  bankAccount: one(bankAccounts, {
    fields: [transactions.bankAccountId],
    references: [bankAccounts.id],
  }),
  expenseCategory: one(expenseCategories, {
    fields: [transactions.expenseCategoryId],
    references: [expenseCategories.id],
  }),
  lineItems: many(transactionItems),
}));

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
  txn: one(transactions, { fields: [transactionItems.txnId], references: [transactions.id] }),
  item: one(items, { fields: [transactionItems.itemId], references: [items.id] }),
}));

export const partiesRelations = relations(parties, ({ many }) => ({
  transactions: many(transactions),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  category: one(itemCategories, { fields: [items.categoryId], references: [itemCategories.id] }),
  unit: one(units, { fields: [items.unitId], references: [units.id] }),
  lines: many(transactionItems),
}));

export const loanAccountsRelations = relations(loanAccounts, ({ many }) => ({
  txns: many(loanTransactions),
}));

export const loanTransactionsRelations = relations(loanTransactions, ({ one }) => ({
  loan: one(loanAccounts, { fields: [loanTransactions.loanId], references: [loanAccounts.id] }),
}));

/* ------------------------------------------------------------------ *
 * Inferred types
 * ------------------------------------------------------------------ */

export type Firm = typeof firms.$inferSelect;
export type Party = typeof parties.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type ItemCategory = typeof itemCategories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type TransactionItem = typeof transactionItems.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type StockAdjustment = typeof stockAdjustments.$inferSelect;
export type LoanAccount = typeof loanAccounts.$inferSelect;
export type LoanTransaction = typeof loanTransactions.$inferSelect;
export type TxnType = (typeof txnTypeEnum.enumValues)[number];
export type TxnStatus = (typeof txnStatusEnum.enumValues)[number];
export type User = typeof users.$inferSelect;
