/**
 * Client-facing types.
 *
 * Everything is re-exported from the Drizzle schema as *types only*, so the
 * database driver never reaches the browser bundle. Note that Postgres
 * `numeric` columns arrive as strings — run them through `num()` before doing
 * arithmetic.
 */
import type {
  Firm,
  Party,
  Item,
  Unit,
  ItemCategory,
  Transaction,
  TransactionItem,
  BankAccount,
  ExpenseCategory,
  StockAdjustment,
  LoanAccount,
  LoanTransaction,
  TxnType,
  TxnStatus,
} from '@/db/schema';

export type {
  Firm,
  Party,
  Item,
  Unit,
  ItemCategory,
  Transaction,
  TransactionItem,
  BankAccount,
  ExpenseCategory,
  StockAdjustment,
  LoanAccount,
  LoanTransaction,
  TxnType,
  TxnStatus,
};

export type ItemRow = Item & { categoryName: string | null; unitShort: string };

export type TransactionRow = Transaction & { partyName: string | null };

export type TransactionDetail = Transaction & {
  lineItems: TransactionItem[];
  party: Party | null;
  allocations: Array<{ id: number; invoiceTxnId: number; amount: string }>;
};

export type PartyDetail = Party & { transactions: Transaction[] };

export type ItemDetail = Item & {
  transactions: Array<{
    txnId: number;
    txnType: TxnType;
    txnNo: number;
    txnDate: string;
    partyName: string | null;
    status: TxnStatus;
    quantity: string;
    unit: string | null;
    pricePerUnit: string;
    total: string;
  }>;
  adjustments: StockAdjustment[];
};

export type TxnSummary = {
  count: number;
  total: number;
  received: number;
  balance: number;
};

export type BootstrapPayload = {
  firm: Firm | null;
  firms: Firm[];
  units: Unit[];
  itemCategories: ItemCategory[];
  expenseCategories: ExpenseCategory[];
  settings: Record<string, string | null>;
};

export type DashboardPayload = {
  range: { from: string; to: string; key: string };
  receivable: number;
  payable: number;
  sale: { total: number; received: number; balance: number; count: number; growth: number };
  purchase: { total: number };
  expense: { total: number };
  cashInHand: number;
  bankBalance: number;
  stockValue: number;
  lowStockCount: number;
  openOrders: number;
  salesSeries: Array<{ date: string; total: number }>;
  recentTransactions: Transaction[];
  today: string;
};

export type BankAccountDetail = BankAccount & {
  openingForPeriod: number;
  statement: Array<{
    id: number;
    date: string;
    description: string;
    txnType: TxnType;
    txnNo: number;
    withdrawal: number;
    deposit: number;
    balance: number;
  }>;
};

export type CashPayload = {
  balance: number;
  entries: Array<{
    id: string;
    txnId: number | null;
    type: string;
    txnType: TxnType | null;
    name: string;
    date: string;
    amount: number;
  }>;
};

export type ExpenseCategoryRow = {
  id: number;
  name: string;
  type: 'direct' | 'indirect';
  total: number;
  balance: number;
};

export type LoanRow = LoanAccount & {
  principalPaid: number;
  interestPaid: number;
};

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
};

/** `null` when nobody is signed in — the client uses that to redirect. */
export type MePayload = { user: AuthUser | null };
