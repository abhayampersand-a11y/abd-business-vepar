/**
 * Database maintenance for the Vyapar app.
 *
 *   node scripts/db.mjs status   — row counts per table
 *   node scripts/db.mjs reset    — wipe transactions/parties/items, keep the firm setup
 *   node scripts/db.mjs seed     — load a small demo business
 *   node scripts/db.mjs item-codes — give every item a unique code (run before `db:push`
 *                                    adds the unique index, if some items share or lack one)
 *
 * `reset` deletes business data. It asks for --yes before doing anything.
 */
import { config } from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

config({ path: '.env' });
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set — add it to .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const command = process.argv[2] ?? 'status';
const confirmed = process.argv.includes('--yes');

/** Tables holding day-to-day business data, in dependency order. */
const BUSINESS_TABLES = [
  'payment_allocations',
  'transaction_items',
  'transactions',
  'stock_adjustments',
  'cash_adjustments',
  'loan_transactions',
  'loan_accounts',
  'bank_accounts',
  'items',
  'item_categories',
  'parties',
];

/** Tables that describe the business itself and survive a reset. */
const SETUP_TABLES = ['firms', 'units', 'expense_categories', 'settings'];

async function status() {
  console.log('Row counts:\n');
  for (const t of [...SETUP_TABLES, ...BUSINESS_TABLES]) {
    const { rows } = await pool.query(`select count(*)::int as n from ${t}`);
    const marker = SETUP_TABLES.includes(t) ? ' ' : '*';
    console.log(`  ${marker} ${String(rows[0].n).padStart(6)}  ${t}`);
  }
  console.log('\n  * cleared by `node scripts/db.mjs reset`');
}

async function reset() {
  if (!confirmed) {
    console.log('This deletes every party, item, transaction and bank account.');
    console.log('Your business profile, units and expense categories are kept.\n');
    console.log('Re-run with --yes to go ahead:');
    console.log('  node scripts/db.mjs reset --yes');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const t of BUSINESS_TABLES) {
      const res = await client.query(`delete from ${t}`);
      if (res.rowCount) console.log(`  cleared ${String(res.rowCount).padStart(5)} from ${t}`);
    }
    await client.query('commit');
    console.log('\nDone — the books are empty and ready to use.');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

async function seed() {
  const { rows: firmRows } = await pool.query('select id, name from firms order by id limit 1');
  if (!firmRows.length) {
    console.error('No firm yet — open the app once so it can set itself up, then seed.');
    return;
  }
  const firmId = firmRows[0].id;

  const { rows: existing } = await pool.query('select count(*)::int as n from parties');
  if (existing[0].n > 0 && !confirmed) {
    console.log('There is already data here. Re-run with --yes to add the demo set anyway.');
    return;
  }

  const { rows: unitRows } = await pool.query(
    `select id from units where firm_id = $1 and short_name = 'Pcs' limit 1`,
    [firmId],
  );
  const pcs = unitRows[0]?.id ?? null;

  const client = await pool.connect();
  try {
    await client.query('begin');

    const { rows: cat } = await client.query(
      `insert into item_categories (firm_id, name) values ($1, 'Stationery'), ($1, 'Electronics')
       returning id, name`,
      [firmId],
    );
    const catByName = Object.fromEntries(cat.map((c) => [c.name, c.id]));

    const demoItems = [
      ['A4 Copier Paper (500 sheets)', 'PPR-A4', '4802', 'Stationery', 320, 245, 12, 40, 10],
      ['Blue Gel Pen', 'PEN-BLU', '9608', 'Stationery', 15, 9, 12, 500, 100],
      ['Spiral Notebook 200pg', 'NB-200', '4820', 'Stationery', 85, 58, 12, 120, 25],
      ['USB-C Cable 1m', 'CAB-USBC', '8544', 'Electronics', 349, 210, 18, 60, 15],
      ['Wireless Mouse', 'MSE-WL', '8471', 'Electronics', 799, 520, 18, 25, 5],
    ];

    // Item codes are unique per firm, so seeding again with --yes suffixes the copies.
    const { rows: codeRows } = await client.query(
      `select lower(item_code) as code from items where firm_id = $1 and item_code is not null`,
      [firmId],
    );
    const taken = new Set(codeRows.map((r) => r.code));
    const freeCode = (code) => {
      let candidate = code;
      for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${code}-${n}`;
      taken.add(candidate.toLowerCase());
      return candidate;
    };

    for (const [name, baseCode, hsn, category, sale, purchase, tax, stock, minStock] of demoItems) {
      const code = freeCode(baseCode);
      await client.query(
        `insert into items
           (firm_id, name, type, item_code, hsn_sac, category_id, unit_id,
            sale_price, purchase_price, tax_rate,
            opening_stock, opening_stock_price, stock_qty, min_stock_level)
         values ($1,$2,'product',$3,$4,$5,$6,$7,$8,$9,$10,$8,$10,$11)`,
        [firmId, name, code, hsn, catByName[category], pcs, sale, purchase, tax, stock, minStock],
      );
    }

    await client.query(
      `insert into items (firm_id, name, type, item_code, hsn_sac, unit_id, sale_price, tax_rate)
       values ($1, 'Annual Maintenance Contract', 'service', $3, '9987', $2, 12000, 18)`,
      [firmId, pcs, freeCode('SVC-AMC')],
    );

    const demoParties = [
      ['Sharma Traders', '9876543210', '24AAAAA0000A1Z5', 'customer', 'Gujarat', 0],
      ['Nova Retail Pvt Ltd', '9811122233', '27BBBBB1111B1Z6', 'customer', 'Maharashtra', 0],
      ['Kabir Stationers', '9900011122', null, 'customer', 'Gujarat', 0],
      ['Paperline Mills', '9765432100', '24CCCCC2222C1Z7', 'supplier', 'Gujarat', 0],
      ['Zenith Electronics', '9822233344', '27DDDDD3333D1Z8', 'supplier', 'Maharashtra', 0],
    ];

    for (const [name, phone, gstin, type, state, opening] of demoParties) {
      await client.query(
        `insert into parties
           (firm_id, name, phone, gstin, party_type, state, opening_balance, balance,
            gst_type, party_group)
         values ($1,$2,$3,$4,$5,$6,$7,$7,$8,'General')`,
        [firmId, name, phone, gstin, type, state, opening, gstin ? 'registered' : 'unregistered'],
      );
    }

    await client.query(
      `insert into bank_accounts (firm_id, account_name, bank_name, opening_balance, balance, as_of_date)
       values ($1, 'HDFC Current', 'HDFC Bank', 50000, 50000, current_date)`,
      [firmId],
    );

    await client.query('commit');
    console.log('Demo data loaded: 6 items, 5 parties, 2 categories and 1 bank account.');
    console.log('Now raise a few invoices in the app to see the reports come alive.');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Mirrors drizzle/0002_item_codes.sql: blank codes become ITM<id>, and later
 * items sharing a code (ignoring case) get their id appended.
 */
async function itemCodes() {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`update items set item_code = null where btrim(item_code) = ''`);
    await client.query(`update items set item_code = btrim(item_code) where item_code <> btrim(item_code)`);
    const dupes = await client.query(
      `update items i set item_code = i.item_code || '-' || i.id
         from (select id, row_number() over (partition by firm_id, lower(item_code) order by id) as rn
                 from items where item_code is not null) d
        where d.id = i.id and d.rn > 1`,
    );
    const filled = await client.query(
      `update items set item_code = 'ITM' || lpad(id::text, greatest(5, length(id::text)), '0')
        where item_code is null`,
    );
    await client.query('commit');
    console.log(`Generated ${filled.rowCount} codes and renamed ${dupes.rowCount} duplicates.`);
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

try {
  if (command === 'status') await status();
  else if (command === 'item-codes') await itemCodes();
  else if (command === 'reset') await reset();
  else if (command === 'seed') await seed();
  else {
    console.log('Usage: node scripts/db.mjs [status|reset|seed|item-codes] [--yes]');
    process.exitCode = 1;
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
