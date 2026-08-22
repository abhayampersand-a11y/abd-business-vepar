import { z } from 'zod';
import { txnTypeEnum } from '@/db/schema';

const money = z.union([z.number(), z.string()]).transform((v) => Number(v) || 0);
const optionalId = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v) => (v === null || v === undefined || v === '' ? null : Number(v)));

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a yyyy-mm-dd date');

export const lineSchema = z.object({
  itemId: optionalId,
  itemName: z.string().min(1, 'Item name is required'),
  hsnSac: z.string().nullish(),
  quantity: money,
  unit: z.string().nullish(),
  pricePerUnit: money,
  isTaxInclusive: z.boolean().optional().default(false),
  discountPercent: money.optional(),
  discountAmount: money.optional(),
  taxRate: money.optional(),
});

export const transactionSchema = z.object({
  txnType: z.enum(txnTypeEnum.enumValues),
  partyId: optionalId,
  partyName: z.string().nullish(),
  txnNo: z.number().int().positive().optional(),
  txnDate: isoDate,
  dueDate: isoDate.nullish(),
  refNo: z.string().nullish(),
  lines: z.array(lineSchema).default([]),
  invoiceDiscountPercent: money.optional(),
  invoiceDiscountAmount: money.optional(),
  additionalCharges: money.optional(),
  roundOffEnabled: z.boolean().optional().default(false),
  /** For payment documents this is the full payment amount. */
  totalAmount: money.optional(),
  receivedAmount: money.optional(),
  paymentType: z.string().optional().default('Cash'),
  bankAccountId: optionalId,
  chequeNo: z.string().nullish(),
  expenseCategoryId: optionalId,
  description: z.string().nullish(),
  notes: z.string().nullish(),
  linkedTxnId: optionalId,
  transportName: z.string().nullish(),
  vehicleNumber: z.string().nullish(),
  deliveryDate: isoDate.nullish(),
  deliveryLocation: z.string().nullish(),
  ewayBillNo: z.string().nullish(),
  /** Invoices this payment settles. */
  allocations: z
    .array(z.object({ invoiceTxnId: z.number().int(), amount: money }))
    .optional()
    .default([]),
});

export type TransactionInput = z.input<typeof transactionSchema>;
export type TransactionParsed = z.output<typeof transactionSchema>;

export const partySchema = z.object({
  name: z.string().min(1, 'Party name is required'),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  gstin: z.string().nullish(),
  gstType: z.string().nullish(),
  partyType: z.enum(['customer', 'supplier', 'both']).optional().default('customer'),
  billingAddress: z.string().nullish(),
  shippingAddress: z.string().nullish(),
  state: z.string().nullish(),
  partyGroup: z.string().nullish(),
  creditLimit: money.nullish(),
  openingBalance: money.optional(),
  openingBalanceType: z.enum(['to_receive', 'to_pay']).optional().default('to_receive'),
  openingDate: isoDate.nullish(),
  isActive: z.boolean().optional(),
});

export const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  type: z.enum(['product', 'service']).optional().default('product'),
  itemCode: z.string().nullish(),
  hsnSac: z.string().nullish(),
  categoryId: optionalId,
  unitId: optionalId,
  description: z.string().nullish(),
  salePrice: money.optional(),
  salePriceTaxInclusive: z.boolean().optional(),
  purchasePrice: money.optional(),
  purchasePriceTaxInclusive: z.boolean().optional(),
  taxRate: money.optional(),
  discountType: z.string().nullish(),
  discountValue: money.optional(),
  openingStock: money.optional(),
  openingStockPrice: money.optional(),
  openingStockDate: isoDate.nullish(),
  minStockLevel: money.optional(),
  location: z.string().nullish(),
  isActive: z.boolean().optional(),
});

export const bankAccountSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  bankName: z.string().nullish(),
  accountNumber: z.string().nullish(),
  ifscCode: z.string().nullish(),
  upiId: z.string().nullish(),
  accountHolderName: z.string().nullish(),
  openingBalance: money.optional(),
  asOfDate: isoDate.nullish(),
  printUpiQr: z.boolean().optional(),
  printBankDetails: z.boolean().optional(),
});

export const stockAdjustmentSchema = z.object({
  itemId: z.coerce.number().int().positive(),
  type: z.enum(['add', 'reduce']),
  quantity: money,
  atPrice: money.optional(),
  adjustmentDate: isoDate,
  details: z.string().nullish(),
});

export const cashAdjustmentSchema = z.object({
  type: z.enum(['add', 'reduce']),
  amount: money,
  adjustmentDate: isoDate,
  description: z.string().nullish(),
});

export const expenseCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['direct', 'indirect']).optional().default('indirect'),
});

export const unitSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
});

export const itemCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
});

export const firmSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  gstin: z.string().nullish(),
  businessType: z.string().nullish(),
  businessCategory: z.string().nullish(),
  state: z.string().nullish(),
  pincode: z.string().nullish(),
  address: z.string().nullish(),
  logoUrl: z.string().nullish(),
  signatureUrl: z.string().nullish(),
  booksBeginDate: isoDate.nullish(),
});

export const loanAccountSchema = z.object({
  lenderName: z.string().min(1, 'Lender name is required'),
  accountNumber: z.string().nullish(),
  loanType: z.string().nullish(),
  description: z.string().nullish(),
  openingBalance: money.optional(),
  interestRate: money.optional(),
  termMonths: z.coerce.number().int().nullish(),
  openingDate: isoDate.nullish(),
});

export const loanTransactionSchema = z.object({
  type: z.string().min(1),
  amount: money,
  principal: money.optional(),
  interest: money.optional(),
  txnDate: isoDate,
  paymentType: z.string().optional().default('Cash'),
  bankAccountId: optionalId,
  description: z.string().nullish(),
});
