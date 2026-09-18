# Dhandho — Business Accounting & Billing

A Vyapar-style billing, inventory and accounting app for small Indian businesses, built with
Next.js, Neon Postgres, Drizzle ORM and Redux Toolkit.

## Getting started

```bash
npm install
cp .env.example .env      # then paste your Neon connection string
npm run db:push           # create the tables
npm run dev               # http://localhost:3000
```

The first request bootstraps a firm called **My Company** along with Vyapar's standard stock units
and expense heads. Open **Utilities → Set Up My Business** to put your real details in — they flow
onto every printed invoice.

Want something to look at first? `npm run db:seed` loads a small demo business (6 items, 5 parties,
a bank account). `npm run db:reset` clears it again.

## What's in it

**Parties** — customers and suppliers with GSTIN, opening balances, credit limits and a running
statement per party.

**Items** — products and services, categories, units, HSN/SAC, tax rates, opening stock, minimum
stock alerts and manual stock adjustments. Every item has a unique code (typed, or generated as
`ITM00042`) and a square QR label for it — see *QR labels* below.

**Sale** — invoices, estimates/quotations, proforma invoices, payment-in, sale orders, delivery
challans and credit notes (sale returns).

**Purchase & Expense** — purchase bills, payment-out, expenses by category, purchase orders and
debit notes (purchase returns).

**Cash & Bank** — bank accounts with a running statement, cash in hand with manual adjustments,
cheque tracking and loan accounts with EMI recording.

**Reports** — day book, all transactions, profit & loss, bill-wise profit, sale aging, cash flow,
balance sheet, party statement, GSTR-1/GSTR-2, GST rate and HSN summaries, stock summary, low
stock, item-wise profit, expense reports and order reports. Every one exports to CSV and prints.

**Utilities** — CSV import for items and parties, CSV export of everything, and *Verify My Data*,
which rebuilds all balances from the underlying ledger.

## How the books work

Every document type — invoice, payment, credit note, expense — lives in one `transactions` table
with a `txn_type`. What each type *does* to the books is declared once in
[`src/lib/constants.ts`](src/lib/constants.ts) (`TXN_META`) and applied in
[`src/server/effects.ts`](src/server/effects.ts):

- **`partySign`** — which way the party balance moves. Positive means the party owes you more.
- **`cashSign`** — which way money moves in cash or the linked bank account.
- **`affectsStock`** — whether goods come in or go out.

Posting a document applies those deltas, editing reverts the old set and applies the new, and
deleting just reverts. Because the arithmetic lives in one place, balances cannot drift between
the three paths.

### Payments vs. amounts received at entry

An invoice stores two separate figures:

- `receivedAmount` — paid on the invoice itself, at the moment it was raised. **This is the ledger
  figure**; the party balance moves by `total − received`.
- `settledAmount` — knocked off later by a separate payment-in document.

Keeping them apart is what stops a payment being counted twice: the payment document posts its own
entry against the party, so the invoice must not also absorb it. `balanceAmount` is
`total − received − settled` and is what every list screen shows.

### Deriving vs. storing

Party balances and item stock are stored (they're read on every row of every list) and updated
inside a database transaction. Cash and bank balances are derived on demand from the ledger, so
there's no running total to drift. `npm run db:status` shows what's in the database, and
**Utilities → Verify My Data** rebuilds the stored figures from scratch if you ever doubt them.

## Data caching

The client uses **RTK Query** with tag-based invalidation, and the entire cache is persisted to
`localStorage` through **redux-persist**. A reload paints instantly from the cache while a
background refetch confirms; a mutation invalidates only the tags it actually touched. Filters and
date ranges are remembered per screen, so navigating away and back keeps your place.

## Project layout

```
src/
  app/
    api/            Route handlers — the whole REST surface
    (screens)/      One folder per module: parties, items, sale, purchase, reports…
  components/
    layout/         Sidebar, top bar, feature-page shell
    txn/            Shared transaction list + entry form (drives every document type)
    ui/             Buttons, inputs, modals, data table, combobox, toasts
  db/               Drizzle schema and the Neon connection
  lib/              Money maths, formatting, validators, CSV
  server/           Posting logic, effects, report helpers
  store/            Redux store, RTK Query API, UI slice
scripts/db.mjs      status / reset / seed
```

## Guide and test cases

[docs/app-guide-ane-test-cases.md](docs/app-guide-ane-test-cases.md) (Gujarati) walks through every
screen and button, shows where each action is reflected, and lists the manual test cases and known
issues. Update it with every change.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run db:push` | Sync the schema to Neon |
| `npm run db:studio` | Browse the database |
| `npm run db:status` | Row counts per table |
| `npm run db:seed` | Load demo data |
| `npm run db:reset` | Clear business data, keep the firm setup |
| `npm run db:item-codes` | Give every existing item a unique code (run before `db:push` on an older database) |

## QR labels

Each item's QR encodes a link, `<your-domain>/i/<item code>` — never the price, so a label stays
right when prices change.

- **Phone camera** — scanning a label opens a phone-sized item page: stock, prices, recent
  transactions, and buttons to sell, purchase or adjust stock.
- **Billing** — the invoice form has a scan box. A USB/Bluetooth scanner types the label (or a
  product's printed barcode) and Enter adds the item; scanning it again adds another unit. The
  **Camera** button does the same on a phone or laptop (needs https, or localhost).
- **Printing** — the QR tile on an item, or **Utilities → Item QR Labels** for many items at once.

Labels use the address the app is opened on. If you print from `localhost` or a LAN address, set
`NEXT_PUBLIC_APP_URL` to the address phones will reach, or the labels won't open on a phone.

**Upgrading an existing database:** item codes are now unique per business (ignoring case). Run
`npm run db:item-codes` once — it fills blank codes and renames duplicates — then `npm run db:push`.
If you apply `drizzle/` migrations instead, `0002_item_codes.sql` does the same.

## Notes

- GST splits into CGST+SGST when your state matches the party's, IGST otherwise. Set your state in
  the business profile for this to work.
- Prices can be entered inclusive or exclusive of tax per line; the taxable value is backed out
  when inclusive.
- The premium-feature screens (WhatsApp Connect, Tally sync, POS) describe what
  they would do and point at the working alternative — they are not wired to a paid service.
