import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { REHYDRATE } from 'redux-persist';
import type { Action } from '@reduxjs/toolkit';
import type {
  BootstrapPayload,
  DashboardPayload,
  Party,
  PartyDetail,
  ItemRow,
  ItemDetail,
  Item,
  ItemCategory,
  Unit,
  TransactionRow,
  TransactionDetail,
  Transaction,
  TxnSummary,
  BankAccount,
  BankAccountDetail,
  CashPayload,
  ExpenseCategoryRow,
  StockAdjustment,
  Firm,
  LoanRow,
} from '@/types';

const TAGS = [
  'Bootstrap',
  'Party',
  'Item',
  'Transaction',
  'Dashboard',
  'Bank',
  'Cash',
  'Report',
  'Firm',
  'ItemCategory',
  'Unit',
  'ExpenseCategory',
  'Loan',
  'StockAdjustment',
] as const;

/** Anything that moves money or stock invalidates these derived views. */
const DERIVED: Array<(typeof TAGS)[number]> = ['Dashboard', 'Report', 'Cash', 'Bank'];

type RehydrateAction = Action<typeof REHYDRATE> & {
  key: string;
  payload?: Record<string, unknown>;
};

function isRehydrate(action: unknown): action is RehydrateAction {
  return (action as Action)?.type === REHYDRATE;
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: TAGS,
  /**
   * Cached responses survive a reload because the whole api slice is persisted.
   * Without this hook redux-persist's REHYDRATE would be ignored by RTK Query.
   */
  extractRehydrationInfo(action, { reducerPath }) {
    if (isRehydrate(action)) {
      return action.payload?.[reducerPath] as never;
    }
    return undefined;
  },
  keepUnusedDataFor: 300,
  refetchOnReconnect: true,
  endpoints: (build) => ({
    /* ---------------- bootstrap & firm ---------------- */
    getBootstrap: build.query<BootstrapPayload, void>({
      query: () => '/bootstrap',
      providesTags: ['Bootstrap', 'Firm', 'Unit', 'ItemCategory', 'ExpenseCategory'],
    }),

    getFirm: build.query<Firm, void>({
      query: () => '/firm',
      providesTags: ['Firm'],
    }),

    updateFirm: build.mutation<Firm, Record<string, unknown>>({
      query: (body) => ({ url: '/firm', method: 'PUT', body }),
      invalidatesTags: ['Firm', 'Bootstrap'],
    }),

    updateSettings: build.mutation<Record<string, string>, Record<string, unknown>>({
      query: (body) => ({ url: '/firm', method: 'PATCH', body }),
      invalidatesTags: ['Bootstrap'],
    }),

    /* ---------------- dashboard ---------------- */
    getDashboard: build.query<DashboardPayload, { range?: string; from?: string; to?: string }>({
      query: (params) => ({ url: '/dashboard', params }),
      providesTags: ['Dashboard'],
    }),

    /* ---------------- parties ---------------- */
    getParties: build.query<Party[], { search?: string; type?: string } | void>({
      query: (params) => ({ url: '/parties', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [...result.map((p) => ({ type: 'Party' as const, id: p.id })), { type: 'Party' as const, id: 'LIST' }]
          : [{ type: 'Party' as const, id: 'LIST' }],
    }),

    getParty: build.query<PartyDetail, number>({
      query: (id) => `/parties/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Party', id }],
    }),

    addParty: build.mutation<Party, Record<string, unknown>>({
      query: (body) => ({ url: '/parties', method: 'POST', body }),
      invalidatesTags: [{ type: 'Party', id: 'LIST' }, ...DERIVED],
    }),

    updateParty: build.mutation<Party, { id: number } & Record<string, unknown>>({
      query: ({ id, ...body }) => ({ url: `/parties/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Party', id: arg.id },
        { type: 'Party', id: 'LIST' },
        ...DERIVED,
      ],
    }),

    deleteParty: build.mutation<{ id: number }, number>({
      query: (id) => ({ url: `/parties/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Party', id: 'LIST' }, ...DERIVED],
    }),

    /* ---------------- items ---------------- */
    getItems: build.query<
      ItemRow[],
      { search?: string; type?: string; categoryId?: number; active?: string } | void
    >({
      query: (params) => ({ url: '/items', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [...result.map((i) => ({ type: 'Item' as const, id: i.id })), { type: 'Item' as const, id: 'LIST' }]
          : [{ type: 'Item' as const, id: 'LIST' }],
    }),

    getItem: build.query<ItemDetail, number>({
      query: (id) => `/items/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Item', id }],
    }),

    addItem: build.mutation<Item, Record<string, unknown>>({
      query: (body) => ({ url: '/items', method: 'POST', body }),
      invalidatesTags: [{ type: 'Item', id: 'LIST' }, ...DERIVED],
    }),

    updateItem: build.mutation<Item, { id: number } & Record<string, unknown>>({
      query: ({ id, ...body }) => ({ url: `/items/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Item', id: arg.id },
        { type: 'Item', id: 'LIST' },
        ...DERIVED,
      ],
    }),

    deleteItem: build.mutation<{ id: number }, number>({
      query: (id) => ({ url: `/items/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Item', id: 'LIST' }, ...DERIVED],
    }),

    /* ---------------- item categories & units ---------------- */
    getItemCategories: build.query<Array<ItemCategory & { itemCount: number }>, void>({
      query: () => '/item-categories',
      providesTags: ['ItemCategory'],
    }),

    addItemCategory: build.mutation<ItemCategory, { name: string }>({
      query: (body) => ({ url: '/item-categories', method: 'POST', body }),
      invalidatesTags: ['ItemCategory', 'Bootstrap'],
    }),

    deleteItemCategory: build.mutation<{ id: number }, number>({
      query: (id) => ({ url: `/item-categories?id=${id}`, method: 'DELETE' }),
      invalidatesTags: ['ItemCategory', 'Bootstrap', { type: 'Item', id: 'LIST' }],
    }),

    getUnits: build.query<Unit[], void>({
      query: () => '/units',
      providesTags: ['Unit'],
    }),

    addUnit: build.mutation<Unit, { name: string; shortName: string }>({
      query: (body) => ({ url: '/units', method: 'POST', body }),
      invalidatesTags: ['Unit', 'Bootstrap'],
    }),

    /* ---------------- transactions ---------------- */
    getTransactions: build.query<
      { transactions: TransactionRow[]; summary: TxnSummary },
      {
        types?: string;
        from?: string;
        to?: string;
        partyId?: number;
        status?: string;
        search?: string;
        limit?: number;
      }
    >({
      query: (params) => ({ url: '/transactions', params }),
      providesTags: (result) =>
        result
          ? [
              ...result.transactions.map((t) => ({ type: 'Transaction' as const, id: t.id })),
              { type: 'Transaction' as const, id: 'LIST' },
            ]
          : [{ type: 'Transaction' as const, id: 'LIST' }],
    }),

    getTransaction: build.query<TransactionDetail, number>({
      query: (id) => `/transactions/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Transaction', id }],
    }),

    getNextTxnNo: build.query<{ txnNo: number }, string>({
      query: (type) => `/transactions/next-number?type=${type}`,
      // Never cached — a stale number would collide on save.
      keepUnusedDataFor: 0,
    }),

    addTransaction: build.mutation<Transaction, Record<string, unknown>>({
      query: (body) => ({ url: '/transactions', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Transaction', id: 'LIST' },
        { type: 'Party', id: 'LIST' },
        { type: 'Item', id: 'LIST' },
        ...DERIVED,
      ],
    }),

    updateTransaction: build.mutation<Transaction, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/transactions/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Transaction', id: arg.id },
        { type: 'Transaction', id: 'LIST' },
        { type: 'Party', id: 'LIST' },
        { type: 'Item', id: 'LIST' },
        ...DERIVED,
      ],
    }),

    deleteTransaction: build.mutation<{ id: number }, number>({
      query: (id) => ({ url: `/transactions/${id}`, method: 'DELETE' }),
      invalidatesTags: [
        { type: 'Transaction', id: 'LIST' },
        { type: 'Party', id: 'LIST' },
        { type: 'Item', id: 'LIST' },
        ...DERIVED,
      ],
    }),

    /* ---------------- banking & cash ---------------- */
    getBankAccounts: build.query<BankAccount[], void>({
      query: () => '/bank-accounts',
      providesTags: ['Bank'],
    }),

    getBankAccount: build.query<BankAccountDetail, { id: number; from?: string; to?: string }>({
      query: ({ id, ...params }) => ({ url: `/bank-accounts/${id}`, params }),
      providesTags: ['Bank'],
    }),

    addBankAccount: build.mutation<BankAccount, Record<string, unknown>>({
      query: (body) => ({ url: '/bank-accounts', method: 'POST', body }),
      invalidatesTags: ['Bank', 'Dashboard'],
    }),

    updateBankAccount: build.mutation<BankAccount, { id: number } & Record<string, unknown>>({
      query: ({ id, ...body }) => ({ url: `/bank-accounts/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Bank', 'Dashboard'],
    }),

    deleteBankAccount: build.mutation<{ id: number }, number>({
      query: (id) => ({ url: `/bank-accounts?id=${id}`, method: 'DELETE' }),
      invalidatesTags: ['Bank', 'Dashboard'],
    }),

    getCash: build.query<CashPayload, void>({
      query: () => '/cash',
      providesTags: ['Cash'],
    }),

    addCashAdjustment: build.mutation<
      unknown,
      { type: 'add' | 'reduce'; amount: number; adjustmentDate: string; description?: string }
    >({
      query: (body) => ({ url: '/cash', method: 'POST', body }),
      invalidatesTags: ['Cash', 'Dashboard', 'Report'],
    }),

    /* ---------------- expense categories ---------------- */
    getExpenseCategories: build.query<ExpenseCategoryRow[], void>({
      query: () => '/expense-categories',
      providesTags: ['ExpenseCategory'],
    }),

    addExpenseCategory: build.mutation<unknown, { name: string; type?: 'direct' | 'indirect' }>({
      query: (body) => ({ url: '/expense-categories', method: 'POST', body }),
      invalidatesTags: ['ExpenseCategory', 'Bootstrap'],
    }),

    deleteExpenseCategory: build.mutation<{ id: number }, number>({
      query: (id) => ({ url: `/expense-categories?id=${id}`, method: 'DELETE' }),
      invalidatesTags: ['ExpenseCategory', 'Bootstrap'],
    }),

    /* ---------------- stock adjustments ---------------- */
    getStockAdjustments: build.query<
      Array<StockAdjustment & { itemName: string | null }>,
      { itemId?: number } | void
    >({
      query: (params) => ({ url: '/stock-adjustments', params: params ?? undefined }),
      providesTags: ['StockAdjustment'],
    }),

    addStockAdjustment: build.mutation<
      StockAdjustment,
      {
        itemId: number;
        type: 'add' | 'reduce';
        quantity: number;
        atPrice?: number;
        adjustmentDate: string;
        details?: string;
      }
    >({
      query: (body) => ({ url: '/stock-adjustments', method: 'POST', body }),
      invalidatesTags: ['StockAdjustment', { type: 'Item', id: 'LIST' }, ...DERIVED],
    }),

    deleteStockAdjustment: build.mutation<{ id: number }, number>({
      query: (id) => ({ url: `/stock-adjustments?id=${id}`, method: 'DELETE' }),
      invalidatesTags: ['StockAdjustment', { type: 'Item', id: 'LIST' }, ...DERIVED],
    }),

    /* ---------------- loans ---------------- */
    getLoans: build.query<LoanRow[], void>({
      query: () => '/loans',
      providesTags: ['Loan'],
    }),

    addLoan: build.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: '/loans', method: 'POST', body }),
      invalidatesTags: ['Loan'],
    }),

    addLoanTransaction: build.mutation<unknown, { loanId: number; body: Record<string, unknown> }>({
      query: ({ loanId, body }) => ({ url: `/loans?loanId=${loanId}`, method: 'PUT', body }),
      invalidatesTags: ['Loan', 'Cash', 'Bank'],
    }),

    deleteLoan: build.mutation<{ id: number }, number>({
      query: (id) => ({ url: `/loans?id=${id}`, method: 'DELETE' }),
      invalidatesTags: ['Loan'],
    }),

    /* ---------------- reports ---------------- */
    getReport: build.query<
      // Report shapes vary per slug; each screen narrows this itself.
      Record<string, unknown>,
      { slug: string; range?: string; from?: string; to?: string; partyId?: number; type?: string }
    >({
      query: ({ slug, ...params }) => ({ url: `/reports/${slug}`, params }),
      providesTags: ['Report'],
    }),

    /* ---------------- utilities ---------------- */
    recalculate: build.mutation<{ message: string }, void>({
      query: () => ({ url: '/utilities/recalculate', method: 'POST' }),
      invalidatesTags: [
        { type: 'Party', id: 'LIST' },
        { type: 'Item', id: 'LIST' },
        ...DERIVED,
      ],
    }),
  }),
});

export const {
  useGetBootstrapQuery,
  useGetFirmQuery,
  useUpdateFirmMutation,
  useUpdateSettingsMutation,
  useGetDashboardQuery,
  useGetPartiesQuery,
  useGetPartyQuery,
  useAddPartyMutation,
  useUpdatePartyMutation,
  useDeletePartyMutation,
  useGetItemsQuery,
  useGetItemQuery,
  useAddItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useGetItemCategoriesQuery,
  useAddItemCategoryMutation,
  useDeleteItemCategoryMutation,
  useGetUnitsQuery,
  useAddUnitMutation,
  useGetTransactionsQuery,
  useGetTransactionQuery,
  useLazyGetNextTxnNoQuery,
  useGetNextTxnNoQuery,
  useAddTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
  useGetBankAccountsQuery,
  useGetBankAccountQuery,
  useAddBankAccountMutation,
  useUpdateBankAccountMutation,
  useDeleteBankAccountMutation,
  useGetCashQuery,
  useAddCashAdjustmentMutation,
  useGetExpenseCategoriesQuery,
  useAddExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  useGetStockAdjustmentsQuery,
  useAddStockAdjustmentMutation,
  useDeleteStockAdjustmentMutation,
  useGetLoansQuery,
  useAddLoanMutation,
  useAddLoanTransactionMutation,
  useDeleteLoanMutation,
  useGetReportQuery,
  useRecalculateMutation,
} = api;
