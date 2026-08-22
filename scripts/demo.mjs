/**
 * Loads a complete demo business, ready to present.
 *
 *   npm run dev          # in one terminal
 *   npm run demo         # in another
 *
 * Everything goes in through the API rather than straight SQL, so the ledger
 * posts through `computeEffects` exactly as it would if a person typed it.
 * That is what keeps parties.balance and items.stockQty honest — Utilities →
 * Verify My Data will agree afterwards.
 *
 * Re-run with --yes to add a second copy on top of existing data.
 */
const BASE = 'http://localhost:3000/api';

const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@vyapar.test',
  password: 'demo-vyapar-2026',
};

let cookie = '';

function captureCookie(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    if (c.startsWith('vyapar_session=')) cookie = c.split(';')[0];
  }
}

async function call(method, path, body) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  captureCookie(res);

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json).slice(0, 250)}`);
  }
  return json;
}

async function signIn() {
  const res = await fetch(BASE + '/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(DEMO_USER),
  });
  captureCookie(res);

  if (res.status === 409) {
    await call('POST', '/auth/login', {
      email: DEMO_USER.email,
      password: DEMO_USER.password,
    });
    console.log(`  signed in as ${DEMO_USER.email}`);
  } else if (res.ok) {
    console.log(`  created login ${DEMO_USER.email}`);
  } else {
    throw new Error(`sign-in failed -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

/** ISO date `n` days before today. */
const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const money = (n) => '₹' + Number(n).toLocaleString('en-IN');

console.log('\n== signing in ==');
await signIn();

const existing = await call('GET', '/parties');
if (existing.length && !process.argv.includes('--yes')) {
  console.log(`\nThere are already ${existing.length} parties here.`);
  console.log('Re-run with --yes to load the demo set on top:  npm run demo -- --yes');
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 * The business itself
 * ------------------------------------------------------------------ */

console.log('\n== business profile ==');
await call('PUT', '/firm', {
  name: 'Shreeji Stationers & Electronics',
  phone: '9825012345',
  email: 'sales@shreejistationers.in',
  gstin: '24ABCDE1234F1Z5',
  businessType: 'Wholesaler',
  businessCategory: 'Stationery & Electronics',
  state: 'Gujarat',
  pincode: '380015',
  address: '14, Swastik Complex, C.G. Road, Ahmedabad',
  booksBeginDate: day(150),
});
console.log('  Shreeji Stationers & Electronics, Ahmedabad (GST 24ABCDE1234F1Z5)');

let boot = await call('GET', '/bootstrap');

// 'Ream' and 'Set' are not among the stock units, and paper is not sold in pieces.
for (const u of [
  { name: 'Ream', shortName: 'Ream' },
  { name: 'Set', shortName: 'Set' },
]) {
  if (!boot.units.some((existingUnit) => existingUnit.shortName === u.shortName)) {
    await call('POST', '/units', u);
  }
}
boot = await call('GET', '/bootstrap');
const unitId = (short) => boot.units.find((u) => u.shortName === short)?.id ?? null;
const expenseCatId = (name) => boot.expenseCategories.find((c) => c.name === name)?.id ?? null;

/* ------------------------------------------------------------------ *
 * Item categories and items
 * ------------------------------------------------------------------ */

console.log('\n== item categories ==');
const catIds = {};
for (const name of ['Stationery', 'Electronics', 'Office Furniture']) {
  const cat = await call('POST', '/item-categories', { name });
  catIds[name] = cat.id;
  console.log(`  ${name}`);
}

console.log('\n== items ==');
// name, code, HSN, category, unit, sale, purchase, GST%, opening stock, min
const ITEMS = [
  ['A4 Copier Paper 75gsm (Ream)', 'PPR-A4', '4802', 'Stationery', 'Ream', 320, 245, 12, 180, 40],
  ['Blue Gel Pen', 'PEN-BLU', '9608', 'Stationery', 'Pcs', 15, 9, 12, 1200, 200],
  ['Spiral Notebook 200 pages', 'NB-200', '4820', 'Stationery', 'Pcs', 85, 58, 12, 400, 80],
  ['File Folder A4', 'FLD-A4', '4820', 'Stationery', 'Pcs', 45, 26, 12, 600, 100],
  ['Stapler Medium', 'STP-MED', '8305', 'Stationery', 'Pcs', 180, 120, 18, 90, 20],
  ['Whiteboard Marker (Set of 4)', 'MRK-WB4', '9608', 'Stationery', 'Set', 220, 145, 12, 150, 30],
  ['USB-C Cable 1m', 'CAB-USBC', '8544', 'Electronics', 'Pcs', 349, 210, 18, 140, 30],
  ['Wireless Mouse', 'MSE-WL', '8471', 'Electronics', 'Pcs', 799, 520, 18, 75, 15],
  ['Keyboard USB', 'KBD-USB', '8471', 'Electronics', 'Pcs', 649, 430, 18, 60, 12],
  ['Pen Drive 64GB', 'PD-64', '8523', 'Electronics', 'Pcs', 549, 380, 18, 110, 25],
  ['Office Chair Mesh', 'CHR-MSH', '9401', 'Office Furniture', 'Pcs', 4800, 3400, 18, 22, 5],
  ['Steel Filing Cabinet', 'CAB-STL', '9403', 'Office Furniture', 'Pcs', 9500, 7100, 18, 8, 2],
];

const item = {};
for (const [name, code, hsn, cat, unit, sale, purchase, tax, stock, min] of ITEMS) {
  const created = await call('POST', '/items', {
    name,
    itemCode: code,
    hsnSac: hsn,
    categoryId: catIds[cat],
    unitId: unitId(unit) ?? unitId('Pcs'),
    salePrice: sale,
    purchasePrice: purchase,
    taxRate: tax,
    openingStock: stock,
    openingStockPrice: purchase,
    openingStockDate: day(150),
    minStockLevel: min,
  });
  item[code] = { ...created, unit, taxRate: tax, salePrice: sale, purchasePrice: purchase };
  console.log(`  ${name.padEnd(32)} ${String(stock).padStart(5)} ${unit}  @ ${money(sale)}`);
}

// One service, to show that not everything carries stock.
const amc = await call('POST', '/items', {
  name: 'Annual Maintenance Contract',
  type: 'service',
  hsnSac: '9987',
  unitId: unitId('Nos') ?? unitId('Pcs'),
  salePrice: 12000,
  taxRate: 18,
});
console.log('  Annual Maintenance Contract      (service)  @ ' + money(12000));

/* ------------------------------------------------------------------ *
 * Parties
 * ------------------------------------------------------------------ */

console.log('\n== parties ==');
// Gujarat parties bill CGST+SGST; the Maharashtra ones bill IGST, so the GST
// reports have both kinds in them.
const PARTIES = [
  ['Sharma Traders', '9876543210', '24AAECS1234A1Z5', 'customer', 'Gujarat', 18500, 'to_receive'],
  ['Nova Retail Pvt Ltd', '9811122233', '27AABCN5678B1Z6', 'customer', 'Maharashtra', 0, 'to_receive'],
  ['Kabir Stationers', '9900011122', null, 'customer', 'Gujarat', 4200, 'to_receive'],
  ['Meera Book Depot', '9723344556', '24AACFM9012C1Z7', 'customer', 'Gujarat', 0, 'to_receive'],
  ['Sunrise School Trust', '9898765432', '24AAATS3456D1Z8', 'customer', 'Gujarat', 0, 'to_receive'],
  ['Tech Bazaar', '9930012345', '27AAFCT7890E1Z9', 'customer', 'Maharashtra', 9800, 'to_receive'],
  ['Paperline Mills', '9765432100', '24AABCP2345F1Z1', 'supplier', 'Gujarat', 26000, 'to_pay'],
  ['Zenith Electronics', '9822233344', '27AADCZ6789G1Z2', 'supplier', 'Maharashtra', 0, 'to_pay'],
  ['Gupta Furniture Works', '9845566778', '24AAKFG1234H1Z3', 'supplier', 'Gujarat', 0, 'to_pay'],
  ['Sagar Packaging', '9712233445', null, 'supplier', 'Gujarat', 3100, 'to_pay'],
];

const party = {};
for (const [name, phone, gstin, type, state, opening, balType] of PARTIES) {
  const created = await call('POST', '/parties', {
    name,
    phone,
    gstin,
    gstType: gstin ? 'registered' : 'unregistered',
    partyType: type,
    state,
    billingAddress: state === 'Gujarat' ? 'Ahmedabad, Gujarat' : 'Mumbai, Maharashtra',
    openingBalance: opening,
    openingBalanceType: balType,
    openingDate: day(150),
    creditLimit: type === 'customer' ? 100000 : null,
  });
  party[name] = created;
  const note = opening ? `opening ${money(opening)} ${balType.replace('_', ' ')}` : '';
  console.log(`  ${name.padEnd(24)} ${type.padEnd(9)} ${state.padEnd(12)} ${note}`);
}

/* ------------------------------------------------------------------ *
 * Bank accounts
 * ------------------------------------------------------------------ */

console.log('\n== bank accounts ==');
const hdfc = await call('POST', '/bank-accounts', {
  accountName: 'HDFC Current',
  bankName: 'HDFC Bank',
  accountNumber: '50200012345678',
  ifscCode: 'HDFC0001234',
  upiId: 'shreeji@hdfcbank',
  accountHolderName: 'Shreeji Stationers & Electronics',
  // Sized so the account stays positive after the demo purchases,
  // payouts, expenses and loan EMIs have gone out of it.
  openingBalance: 600000,
  asOfDate: day(150),
  printBankDetails: true,
  printUpiQr: true,
});
console.log('  HDFC Current      opening ' + money(600000));

const kotak = await call('POST', '/bank-accounts', {
  accountName: 'Kotak Savings',
  bankName: 'Kotak Mahindra Bank',
  accountNumber: '7712345678',
  ifscCode: 'KKBK0000123',
  openingBalance: 60000,
  asOfDate: day(150),
});
console.log('  Kotak Savings     opening ' + money(60000));

/* ------------------------------------------------------------------ *
 * Transactions
 * ------------------------------------------------------------------ */

/** A sale line at list price. */
const sell = (code, qty, price) => ({
  itemId: item[code].id,
  itemName: item[code].name,
  hsnSac: item[code].hsnSac,
  quantity: qty,
  unit: item[code].unit,
  pricePerUnit: price ?? item[code].salePrice,
  taxRate: item[code].taxRate,
});

/** A purchase line at cost. */
const buy = (code, qty, price) => ({
  ...sell(code, qty, price ?? item[code].purchasePrice),
});

console.log('\n== purchase bills ==');
const purchases = [
  [110, 'Paperline Mills', 'Bank Account', 0, [buy('PPR-A4', 200), buy('NB-200', 300), buy('FLD-A4', 400)]],
  [96, 'Zenith Electronics', 'Bank Account', 40000, [buy('CAB-USBC', 120), buy('MSE-WL', 60), buy('PD-64', 100)]],
  [74, 'Gupta Furniture Works', 'Cheque', 0, [buy('CHR-MSH', 20), buy('CAB-STL', 6)]],
  [52, 'Paperline Mills', 'Bank Account', 25000, [buy('PPR-A4', 150), buy('PEN-BLU', 1000)]],
  [28, 'Zenith Electronics', 'Bank Account', 0, [buy('KBD-USB', 50), buy('MSE-WL', 40)]],
];

const purchaseBills = [];
for (const [ago, supplier, payType, paid, lines] of purchases) {
  const bill = await call('POST', '/transactions', {
    txnType: 'purchase',
    partyId: party[supplier].id,
    txnDate: day(ago),
    dueDate: day(ago - 30),
    paymentType: payType,
    bankAccountId: payType === 'Bank Account' ? hdfc.id : null,
    receivedAmount: paid,
    roundOffEnabled: true,
    refNo: 'SUP/' + (2000 + purchaseBills.length),
    lines,
  });
  purchaseBills.push({ ...bill, supplierName: supplier });
  console.log(
    `  ${bill.txnDate}  ${supplier.padEnd(24)} ${money(bill.totalAmount).padStart(12)}` +
      (paid ? `  paid ${money(paid)}` : '  on credit'),
  );
}

console.log('\n== sale invoices ==');
// days ago, customer, payment type, received at entry, lines
const sales = [
  [88, 'Sharma Traders', 'Cash', 0, [sell('PPR-A4', 25), sell('PEN-BLU', 200), sell('NB-200', 40)]],
  [82, 'Kabir Stationers', 'Cash', 5000, [sell('FLD-A4', 100), sell('MRK-WB4', 20)]],
  [76, 'Nova Retail Pvt Ltd', 'Bank Account', 0, [sell('MSE-WL', 15), sell('CAB-USBC', 30)]],
  [70, 'Sunrise School Trust', 'Cheque', 20000, [sell('NB-200', 200), sell('PEN-BLU', 500), sell('PPR-A4', 30)]],
  [63, 'Meera Book Depot', 'Cash', 3000, [sell('NB-200', 60), sell('FLD-A4', 80)]],
  [57, 'Tech Bazaar', 'Bank Account', 0, [sell('PD-64', 40), sell('KBD-USB', 20)]],
  [49, 'Sharma Traders', 'UPI', 12000, [sell('CHR-MSH', 4), sell('STP-MED', 15)]],
  [42, 'Nova Retail Pvt Ltd', 'Bank Account', 0, [sell('MSE-WL', 20), sell('PD-64', 30), sell('CAB-USBC', 25)]],
  [35, 'Kabir Stationers', 'Cash', 8000, [sell('PPR-A4', 30), sell('MRK-WB4', 25), sell('FLD-A4', 60)]],
  [29, 'Sunrise School Trust', 'Bank Account', 0, [sell('CAB-STL', 2), sell('CHR-MSH', 6)]],
  [21, 'Meera Book Depot', 'Cash', 4500, [sell('NB-200', 50), sell('PEN-BLU', 300)]],
  [15, 'Tech Bazaar', 'Bank Account', 25000, [sell('MSE-WL', 18), sell('KBD-USB', 15), sell('PD-64', 25)]],
  [9, 'Sharma Traders', 'Cash', 0, [sell('PPR-A4', 40), sell('STP-MED', 20), sell('FLD-A4', 100)]],
  [4, 'Sunrise School Trust', 'Cheque', 0, [sell('CHR-MSH', 5), sell('NB-200', 80)]],
  [1, 'Nova Retail Pvt Ltd', 'Bank Account', 0, [sell('CAB-USBC', 40), sell('PD-64', 20)]],
];

const invoices = [];
for (const [ago, customer, payType, received, lines] of sales) {
  const inv = await call('POST', '/transactions', {
    txnType: 'sale',
    partyId: party[customer].id,
    txnDate: day(ago),
    dueDate: day(ago - 21),
    paymentType: payType,
    bankAccountId: payType === 'Bank Account' ? hdfc.id : null,
    receivedAmount: received,
    roundOffEnabled: true,
    lines,
  });
  invoices.push(inv);
  console.log(
    `  ${inv.txnDate}  ${String(inv.prefix + '-' + inv.txnNo).padEnd(9)} ${customer.padEnd(22)}` +
      ` ${money(inv.totalAmount).padStart(12)}  ${inv.status}`,
  );
}

console.log('\n== payments received ==');
// Part-settle a few older invoices so the ageing report has something to show
// and the receivables are not all one bucket.
const receipts = [
  [80, 0, 'Cash', 15000],
  [68, 2, 'Bank Account', 30000],
  [55, 3, 'Cheque', 40000],
  [40, 5, 'Bank Account', 20000],
  [24, 7, 'UPI', 35000],
  [11, 9, 'Bank Account', 50000],
];

for (const [ago, invoiceIndex, payType, amount] of receipts) {
  const inv = invoices[invoiceIndex];
  const outstanding = Number(inv.totalAmount) - Number(inv.receivedAmount);
  const pay = Math.min(amount, Math.round(outstanding));
  if (pay <= 0) continue;

  const receipt = await call('POST', '/transactions', {
    txnType: 'payment_in',
    partyId: inv.partyId,
    txnDate: day(ago),
    totalAmount: pay,
    paymentType: payType,
    bankAccountId: payType === 'Bank Account' ? hdfc.id : null,
    chequeNo: payType === 'Cheque' ? 'CHQ' + (100000 + ago) : null,
    allocations: [{ invoiceTxnId: inv.id, amount: pay }],
  });
  console.log(
    `  ${receipt.txnDate}  ${money(pay).padStart(11)} against ${inv.prefix}-${inv.txnNo}  (${payType})`,
  );
}

console.log('\n== payments made ==');
const payouts = [
  [100, 0, 'Bank Account', 60000],
  [66, 2, 'Cheque', 80000],
  [44, 3, 'Bank Account', 45000],
  [18, 4, 'Bank Account', 30000],
];

for (const [ago, billIndex, payType, amount] of payouts) {
  const bill = purchaseBills[billIndex];
  const outstanding = Number(bill.totalAmount) - Number(bill.receivedAmount);
  const pay = Math.min(amount, Math.round(outstanding));
  if (pay <= 0) continue;

  const payout = await call('POST', '/transactions', {
    txnType: 'payment_out',
    partyId: bill.partyId,
    txnDate: day(ago),
    totalAmount: pay,
    paymentType: payType,
    bankAccountId: payType === 'Bank Account' ? hdfc.id : null,
    chequeNo: payType === 'Cheque' ? 'CHQ' + (200000 + ago) : null,
    allocations: [{ invoiceTxnId: bill.id, amount: pay }],
  });
  console.log(`  ${payout.txnDate}  ${money(pay).padStart(11)} to ${bill.supplierName}  (${payType})`);
}

console.log('\n== expenses ==');
// Rent and salary every month, plus the smaller running costs.
const expenses = [];
for (const ago of [105, 75, 45, 15]) {
  expenses.push([ago, 'Rent', 'Shop rent', 18000, 'Bank Account']);
  expenses.push([ago - 2, 'Salary', 'Staff salary', 46000, 'Bank Account']);
}
expenses.push(
  [92, 'Transport', 'Goods transport — Paperline consignment', 3400, 'Cash'],
  [61, 'Petrol', 'Delivery van fuel', 2800, 'Cash'],
  [38, 'Transport', 'Courier charges', 1650, 'Cash'],
  [27, 'Tea', 'Shop pantry', 900, 'Cash'],
  [12, 'Petrol', 'Delivery van fuel', 3100, 'Cash'],
  [5, 'Transport', 'Goods transport — Zenith consignment', 2200, 'Cash'],
);

for (const [ago, category, note, amount, payType] of expenses) {
  await call('POST', '/transactions', {
    txnType: 'expense',
    txnDate: day(ago),
    expenseCategoryId: expenseCatId(category),
    paymentType: payType,
    bankAccountId: payType === 'Bank Account' ? hdfc.id : null,
    receivedAmount: amount,
    description: note,
    lines: [{ itemName: note, quantity: 1, pricePerUnit: amount, taxRate: 0 }],
  });
}
console.log(`  ${expenses.length} expenses posted across rent, salary, transport, petrol and tea`);

console.log('\n== returns ==');
const creditNote = await call('POST', '/transactions', {
  txnType: 'credit_note',
  partyId: party['Kabir Stationers'].id,
  txnDate: day(31),
  linkedTxnId: invoices[8].id,
  paymentType: 'Cash',
  receivedAmount: 0,
  description: 'Damaged in transit — 5 folders returned',
  lines: [sell('FLD-A4', 5)],
});
console.log(`  credit note ${creditNote.prefix}-${creditNote.txnNo}  ${money(creditNote.totalAmount)}  (Kabir Stationers)`);

const debitNote = await call('POST', '/transactions', {
  txnType: 'debit_note',
  partyId: party['Zenith Electronics'].id,
  txnDate: day(24),
  linkedTxnId: purchaseBills[4].id,
  paymentType: 'Cash',
  receivedAmount: 0,
  description: 'Short supply — 4 keyboards returned',
  lines: [buy('KBD-USB', 4)],
});
console.log(`  debit note  ${debitNote.prefix}-${debitNote.txnNo}  ${money(debitNote.totalAmount)}  (Zenith Electronics)`);

console.log('\n== quotations and orders ==');
// These do not touch the books — they sit waiting to be converted.
const estimate = await call('POST', '/transactions', {
  txnType: 'estimate',
  partyId: party['Sunrise School Trust'].id,
  txnDate: day(6),
  description: 'Annual stationery requirement — for approval',
  lines: [sell('NB-200', 300), sell('PEN-BLU', 1000), sell('PPR-A4', 60)],
});
console.log(`  estimate       ${estimate.prefix}-${estimate.txnNo}  ${money(estimate.totalAmount)}  (Sunrise School Trust)`);

const proforma = await call('POST', '/transactions', {
  txnType: 'proforma',
  partyId: party['Tech Bazaar'].id,
  txnDate: day(3),
  lines: [sell('MSE-WL', 25), sell('KBD-USB', 25)],
});
console.log(`  proforma       ${proforma.prefix}-${proforma.txnNo}  ${money(proforma.totalAmount)}  (Tech Bazaar)`);

const saleOrder = await call('POST', '/transactions', {
  txnType: 'sale_order',
  partyId: party['Nova Retail Pvt Ltd'].id,
  txnDate: day(5),
  dueDate: day(-10),
  lines: [sell('PD-64', 50), sell('CAB-USBC', 60)],
});
console.log(`  sale order     ${saleOrder.prefix}-${saleOrder.txnNo}  ${money(saleOrder.totalAmount)}  (Nova Retail)`);

const purchaseOrder = await call('POST', '/transactions', {
  txnType: 'purchase_order',
  partyId: party['Paperline Mills'].id,
  txnDate: day(2),
  dueDate: day(-14),
  lines: [buy('PPR-A4', 250), buy('NB-200', 400)],
});
console.log(`  purchase order ${purchaseOrder.prefix}-${purchaseOrder.txnNo}  ${money(purchaseOrder.totalAmount)}  (Paperline Mills)`);

const challan = await call('POST', '/transactions', {
  txnType: 'delivery_challan',
  partyId: party['Sunrise School Trust'].id,
  txnDate: day(7),
  transportName: 'Gujarat Roadways',
  vehicleNumber: 'GJ-01-AB-4589',
  deliveryLocation: 'Sunrise School, Satellite, Ahmedabad',
  deliveryDate: day(6),
  lines: [sell('CHR-MSH', 5), sell('NB-200', 80)],
});
console.log(`  challan        ${challan.prefix}-${challan.txnNo}  (Gujarat Roadways, GJ-01-AB-4589)`);

console.log('\n== cash, loan and stock adjustments ==');
await call('POST', '/cash', {
  type: 'add',
  amount: 25000,
  adjustmentDate: day(90),
  description: 'Cash brought in from savings',
});
await call('POST', '/cash', {
  type: 'reduce',
  amount: 8000,
  adjustmentDate: day(33),
  description: 'Cash deposited into HDFC',
});
console.log('  2 cash adjustments');

const loan = await call('POST', '/loans', {
  lenderName: 'Bajaj Finserv',
  accountNumber: 'BFL-99001234',
  loanType: 'Business Loan',
  description: 'Working capital loan',
  openingBalance: 300000,
  interestRate: 13.5,
  termMonths: 36,
  openingDate: day(140),
});
for (const ago of [110, 80, 50, 20]) {
  await call('PUT', '/loans?loanId=' + loan.id, {
    type: 'emi',
    amount: 10200,
    principal: 6800,
    interest: 3400,
    txnDate: day(ago),
    paymentType: 'Bank Account',
    bankAccountId: hdfc.id,
    description: 'Monthly EMI',
  });
}
console.log('  Bajaj Finserv business loan ' + money(300000) + ' with 4 EMIs paid');

await call('POST', '/stock-adjustments', {
  itemId: item['PEN-BLU'].id,
  type: 'reduce',
  quantity: 25,
  atPrice: item['PEN-BLU'].purchasePrice,
  adjustmentDate: day(36),
  details: 'Dried up in storage',
});
await call('POST', '/stock-adjustments', {
  itemId: item['NB-200'].id,
  type: 'add',
  quantity: 12,
  atPrice: item['NB-200'].purchasePrice,
  adjustmentDate: day(14),
  details: 'Found during stock count',
});
console.log('  2 stock adjustments');

/* ------------------------------------------------------------------ *
 * Verification
 * ------------------------------------------------------------------ */

console.log('\n== checking the books agree with the ledger ==');

// Snapshot what posting produced, run the rebuild that backs
// Utilities → Verify My Data, then compare. If `computeEffects` and
// `recalculateBalances` ever disagree, it shows up right here.
const before = {
  parties: await call('GET', '/parties'),
  items: await call('GET', '/items'),
};

await call('POST', '/utilities/recalculate');

const after = {
  parties: await call('GET', '/parties'),
  items: await call('GET', '/items'),
};

let drift = 0;
for (const p of before.parties) {
  const now = after.parties.find((x) => x.id === p.id);
  if (Math.abs(Number(p.balance) - Number(now.balance)) > 0.005) {
    drift++;
    console.log(`  DRIFT  ${p.name}: posted ${p.balance}, recalculated ${now.balance}`);
  }
}
for (const i of before.items) {
  const now = after.items.find((x) => x.id === i.id);
  if (Math.abs(Number(i.stockQty) - Number(now.stockQty)) > 0.005) {
    drift++;
    console.log(`  DRIFT  ${i.name}: posted ${i.stockQty}, recalculated ${now.stockQty}`);
  }
}

console.log(
  drift === 0
    ? `  OK — ${before.parties.length} party balances and ${before.items.length} stock figures match`
    : `  ${drift} mismatches found`,
);

/* ------------------------------------------------------------------ *
 * What the demo will show
 * ------------------------------------------------------------------ */

const dash = await call('GET', '/dashboard', undefined);
const cash = await call('GET', '/cash');
const banks = await call('GET', '/bank-accounts');
const txns = await call('GET', '/transactions?limit=500');

console.log('\n' + '='.repeat(58));
console.log('  Shreeji Stationers & Electronics — ready to demo');
console.log('='.repeat(58));
console.log(`  Login          ${DEMO_USER.email}  /  ${DEMO_USER.password}`);
console.log(`  Parties        ${after.parties.length}`);
console.log(`  Items          ${after.items.length}`);
console.log(`  Transactions   ${Array.isArray(txns) ? txns.length : (txns.rows?.length ?? '?')}`);
console.log(`  Cash in hand   ${money(Math.round(cash.balance ?? cash.cashInHand ?? 0))}`);
for (const b of banks) console.log(`  ${b.accountName.padEnd(14)} ${money(Math.round(b.balance))}`);
if (dash?.totalReceivable !== undefined) {
  console.log(`  Receivable     ${money(Math.round(dash.totalReceivable))}`);
  console.log(`  Payable        ${money(Math.round(dash.totalPayable))}`);
}
console.log('='.repeat(58));
console.log('\n  Open http://localhost:3000 and sign in.\n');

if (drift > 0) process.exitCode = 1;
