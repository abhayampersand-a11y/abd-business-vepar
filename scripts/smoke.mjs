/**
 * End-to-end ledger test.
 *
 * Exercises posting, editing, deleting, payment allocation, tax-inclusive
 * pricing, discounts, stock movement and the reports against a running dev
 * server, checking the arithmetic at every step.
 *
 *   npm run dev            # in one terminal
 *   npm run test:ledger    # in another
 *
 * It creates records prefixed "Smoke" and leaves them behind so you can look
 * at what it did. Clear them with: npm run db:reset
 */
const BASE = 'http://localhost:3000/api';

let pass = 0;
let fail = 0;

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

function check(label, actual, expected) {
  const ok = Math.abs(Number(actual) - Number(expected)) < 0.005;
  if (ok) {
    pass++;
    console.log(`  PASS  ${label}: ${actual}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}: got ${actual}, expected ${expected}`);
  }
}

const today = new Date().toISOString().slice(0, 10);

console.log('\n== setup ==');
const party = await call('POST', '/parties', {
  name: 'Smoke Test Traders ' + Date.now(),
  phone: '9999900001',
  state: 'Gujarat',
  partyType: 'both',
  openingBalance: 1000,
  openingBalanceType: 'to_receive',
});
console.log('  party', party.id, 'opening balance', party.balance);
check('party opening balance', party.balance, 1000);

const item = await call('POST', '/items', {
  name: 'Smoke Widget ' + Date.now(),
  salePrice: 250,
  purchasePrice: 200,
  taxRate: 18,
  openingStock: 12,
  openingStockPrice: 200,
  minStockLevel: 5,
});
console.log('  item', item.id, 'stock', item.stockQty);
check('item opening stock', item.stockQty, 12);

console.log('\n== sale invoice: 2 x 250 @ 18% GST, 100 received ==');
const sale = await call('POST', '/transactions', {
  txnType: 'sale',
  partyId: party.id,
  txnDate: today,
  dueDate: today,
  paymentType: 'Cash',
  receivedAmount: 100,
  roundOffEnabled: true,
  lines: [
    { itemId: item.id, itemName: item.name, quantity: 2, pricePerUnit: 250, taxRate: 18, unit: 'Pcs' },
  ],
});
// 2*250 = 500 taxable, 18% = 90 tax, total 590
check('sale subtotal', sale.subtotal, 500);
check('sale tax', sale.taxAmount, 90);
check('sale total', sale.totalAmount, 590);
check('sale received', sale.receivedAmount, 100);
check('sale balance', sale.balanceAmount, 490);
console.log('  status:', sale.status);

let p = await call('GET', `/parties/${party.id}`);
check('party balance after sale (1000 + 490)', p.balance, 1490);

let it = await call('GET', `/items/${item.id}`);
check('stock after sale (12 - 2)', it.stockQty, 10);

console.log('\n== payment-in 300, allocated to the invoice ==');
const payment = await call('POST', '/transactions', {
  txnType: 'payment_in',
  partyId: party.id,
  txnDate: today,
  totalAmount: 300,
  paymentType: 'Cash',
  allocations: [{ invoiceTxnId: sale.id, amount: 300 }],
});
check('payment total', payment.totalAmount, 300);

p = await call('GET', `/parties/${party.id}`);
check('party balance after payment (1490 - 300)', p.balance, 1190);

const saleAfter = await call('GET', `/transactions/${sale.id}`);
check('invoice received stays at entry amount', saleAfter.receivedAmount, 100);
check('invoice settled by the payment', saleAfter.settledAmount, 300);
check(
  'invoice total paid (received + settled)',
  Number(saleAfter.receivedAmount) + Number(saleAfter.settledAmount),
  400,
);
check('invoice balance after allocation', saleAfter.balanceAmount, 190);
console.log('  invoice status:', saleAfter.status);

console.log('\n== credit note: return 1 unit ==');
const creditNote = await call('POST', '/transactions', {
  txnType: 'credit_note',
  partyId: party.id,
  txnDate: today,
  linkedTxnId: sale.id,
  receivedAmount: 0,
  lines: [
    { itemId: item.id, itemName: item.name, quantity: 1, pricePerUnit: 250, taxRate: 18, unit: 'Pcs' },
  ],
});
check('credit note total', creditNote.totalAmount, 295);

p = await call('GET', `/parties/${party.id}`);
check('party balance after credit note (1190 - 295)', p.balance, 895);

it = await call('GET', `/items/${item.id}`);
check('stock after return (10 + 1)', it.stockQty, 11);

console.log('\n== purchase bill: 5 x 200 @ 18%, fully paid ==');
const purchase = await call('POST', '/transactions', {
  txnType: 'purchase',
  partyId: party.id,
  txnDate: today,
  receivedAmount: 1180,
  paymentType: 'Cash',
  lines: [
    { itemId: item.id, itemName: item.name, quantity: 5, pricePerUnit: 200, taxRate: 18, unit: 'Pcs' },
  ],
});
check('purchase total', purchase.totalAmount, 1180);
check('purchase balance', purchase.balanceAmount, 0);

it = await call('GET', `/items/${item.id}`);
check('stock after purchase (11 + 5)', it.stockQty, 16);

p = await call('GET', `/parties/${party.id}`);
check('party balance unchanged by fully-paid purchase', p.balance, 895);

console.log('\n== tax-inclusive pricing ==');
const inclusive = await call('POST', '/transactions', {
  txnType: 'sale',
  partyId: party.id,
  txnDate: today,
  receivedAmount: 0,
  roundOffEnabled: false,
  lines: [
    {
      itemId: item.id,
      itemName: item.name,
      quantity: 1,
      pricePerUnit: 118,
      taxRate: 18,
      isTaxInclusive: true,
      unit: 'Pcs',
    },
  ],
});
// 118 inclusive of 18% => 100 taxable + 18 tax
check('inclusive taxable', inclusive.subtotal, 100);
check('inclusive tax', inclusive.taxAmount, 18);
check('inclusive total', inclusive.totalAmount, 118);

console.log('\n== line discount ==');
const discounted = await call('POST', '/transactions', {
  txnType: 'sale',
  partyId: party.id,
  txnDate: today,
  receivedAmount: 0,
  roundOffEnabled: false,
  lines: [
    {
      itemId: item.id,
      itemName: item.name,
      quantity: 4,
      pricePerUnit: 100,
      discountPercent: 10,
      taxRate: 5,
      unit: 'Pcs',
    },
  ],
});
// 400 gross - 40 discount = 360 taxable, 5% = 18, total 378
check('discount taxable', discounted.subtotal, 360);
check('discount tax', discounted.taxAmount, 18);
check('discount total', discounted.totalAmount, 378);

console.log('\n== edit reverses the old posting ==');
const beforeEdit = await call('GET', `/parties/${party.id}`);
await call('PUT', `/transactions/${discounted.id}`, {
  txnType: 'sale',
  partyId: party.id,
  txnDate: today,
  receivedAmount: 378,
  roundOffEnabled: false,
  lines: [
    {
      itemId: item.id,
      itemName: item.name,
      quantity: 4,
      pricePerUnit: 100,
      discountPercent: 10,
      taxRate: 5,
      unit: 'Pcs',
    },
  ],
});
const afterEdit = await call('GET', `/parties/${party.id}`);
check(
  'party balance drops by the now-paid 378',
  afterEdit.balance,
  Number(beforeEdit.balance) - 378,
);

const itBeforeQtyEdit = await call('GET', `/items/${item.id}`);
await call('PUT', `/transactions/${discounted.id}`, {
  txnType: 'sale',
  partyId: party.id,
  txnDate: today,
  receivedAmount: 0,
  roundOffEnabled: false,
  lines: [
    { itemId: item.id, itemName: item.name, quantity: 6, pricePerUnit: 100, taxRate: 5, unit: 'Pcs' },
  ],
});
const itAfterQtyEdit = await call('GET', `/items/${item.id}`);
check(
  'stock reflects qty 4 -> 6 (net -2)',
  itAfterQtyEdit.stockQty,
  Number(itBeforeQtyEdit.stockQty) - 2,
);

console.log('\n== delete reverses everything ==');
const beforeDelete = await call('GET', `/parties/${party.id}`);
const itBeforeDelete = await call('GET', `/items/${item.id}`);
await call('DELETE', `/transactions/${discounted.id}`);
const afterDelete = await call('GET', `/parties/${party.id}`);
const itAfterDelete = await call('GET', `/items/${item.id}`);
// deleted invoice: 6 x 100 @5% = 630, unpaid
check('party balance restored', afterDelete.balance, Number(beforeDelete.balance) - 630);
check('stock restored', itAfterDelete.stockQty, Number(itBeforeDelete.stockQty) + 6);

console.log('\n== expense ==');
const expenseCats = await call('GET', '/expense-categories');
const salary = expenseCats.find((c) => c.name === 'Salary') ?? expenseCats[0];
const expense = await call('POST', '/transactions', {
  txnType: 'expense',
  txnDate: today,
  expenseCategoryId: salary.id,
  partyName: 'Staff',
  receivedAmount: 10000,
  paymentType: 'Cash',
  roundOffEnabled: false,
  lines: [{ itemName: 'Monthly salary', quantity: 1, pricePerUnit: 10000, taxRate: 0 }],
});
check('expense total', expense.totalAmount, 10000);

console.log('\n== derived views ==');
const cash = await call('GET', '/cash');
console.log('  cash in hand:', cash.balance, `(${cash.entries.length} entries)`);

const dash = await call('GET', '/dashboard?range=this_month');
console.log('  receivable:', dash.receivable, '| payable:', dash.payable);
console.log('  sale total:', dash.sale.total, '| stock value:', dash.stockValue);
console.log('  low stock items:', dash.lowStockCount);

const pl = await call('GET', '/reports/profit-and-loss?range=this_year');
console.log('  P&L net sale:', pl.netSale, '| net purchase:', pl.netPurchase, '| net profit:', pl.netProfit);

const daybook = await call('GET', '/reports/day-book?range=this_month');
console.log('  daybook rows:', daybook.rows.length, '| money in:', daybook.summary.moneyIn, '| out:', daybook.summary.moneyOut);

const statement = await call('GET', `/reports/party-statement?partyId=${party.id}&range=this_year`);
check('statement closing matches party balance', statement.closing, afterDelete.balance);

const gstr1 = await call('GET', '/reports/gstr-1?range=this_month');
console.log('  GSTR-1 rows:', gstr1.rows.length);

const stockSummary = await call('GET', '/reports/stock-summary');
console.log('  stock summary rows:', stockSummary.rows.length, '| value:', stockSummary.summary.stockValue);

const aging = await call('GET', '/reports/sale-aging');
console.log('  aging buckets:', JSON.stringify(aging.buckets));

console.log('\n== recalculate rebuilds denormalised values ==');
const partyBefore = await call('GET', `/parties/${party.id}`);
const itemBefore = await call('GET', `/items/${item.id}`);
await call('POST', '/utilities/recalculate');
const partyAfter = await call('GET', `/parties/${party.id}`);
const itemAfter = await call('GET', `/items/${item.id}`);
check('recalculated party balance matches running balance', partyAfter.balance, partyBefore.balance);
check('recalculated stock matches running stock', itemAfter.stockQty, itemBefore.stockQty);

console.log('\n== stock adjustment ==');
const adj = await call('POST', '/stock-adjustments', {
  itemId: item.id,
  type: 'add',
  quantity: 3,
  atPrice: 200,
  adjustmentDate: today,
  details: 'Found extra stock',
});
const itAfterAdj = await call('GET', `/items/${item.id}`);
check('stock after +3 adjustment', itAfterAdj.stockQty, Number(itemAfter.stockQty) + 3);
await call('DELETE', `/stock-adjustments?id=${adj.id}`);
const itAfterAdjDelete = await call('GET', `/items/${item.id}`);
check('adjustment delete reverses stock', itAfterAdjDelete.stockQty, itemAfter.stockQty);

console.log('\n== bank account ==');
const bank = await call('POST', '/bank-accounts', {
  accountName: 'Smoke Bank ' + Date.now(),
  bankName: 'HDFC',
  openingBalance: 5000,
  asOfDate: today,
});
await call('POST', '/transactions', {
  txnType: 'payment_in',
  partyId: party.id,
  txnDate: today,
  totalAmount: 2000,
  paymentType: 'Bank Account',
  bankAccountId: bank.id,
});
const bankDetail = await call('GET', `/bank-accounts/${bank.id}`);
check('bank balance 5000 + 2000', bankDetail.balance, 7000);
console.log('  statement lines:', bankDetail.statement.length);

console.log(`\n==================\n${pass} passed, ${fail} failed\n==================`);
process.exit(fail ? 1 : 0);
