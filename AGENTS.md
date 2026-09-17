<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Vyapar app — working notes

## The ledger is the thing

Every document type (invoice, payment, credit note, expense, order…) is a row in the single
`transactions` table, discriminated by `txn_type`. What a type does to the books is declared once
in `TXN_META` (`src/lib/constants.ts`) and applied by `computeEffects` (`src/server/effects.ts`).

**Add a document type by adding an entry to the enum and to `TXN_META`.** Do not special-case
posting logic in a route handler — if a new type needs behaviour the three signs cannot express,
extend `computeEffects` so create, update and delete all stay consistent.

Posting applies deltas; editing reverts the old set then applies the new; deleting reverts. All
three go through `src/server/txn-service.ts` inside a database transaction.

## Two received figures, deliberately

- `transactions.receivedAmount` — paid on the document at entry time. **The ledger uses this.**
- `transactions.settledAmount` — knocked off later by a separate payment document.

A payment-in posts its own party entry, so folding its allocation into the invoice's
`receivedAmount` would double-count it. Party maths uses `total − received`, never `balanceAmount`.
`balanceAmount = total − received − settled` is for display only.

## Stored vs. derived

- **Stored** (updated transactionally): `parties.balance`, `items.stockQty`.
- **Derived** (computed per query): cash in hand, bank balances — see `src/server/money.ts`.

`recalculateBalances()` rebuilds the stored values from the ledger; it backs
Utilities → Verify My Data. If you change posting logic, make sure that function agrees with
`computeEffects`, or the two will disagree and the smoke test will catch it.

## Money handling

- Postgres `numeric` arrives as a **string**. Run it through `num()` from `src/lib/format.ts`
  before doing arithmetic.
- Invoice arithmetic lives in `src/lib/calc.ts` and is shared by the entry form and the API, so
  the number the user watches while typing is the number that gets stored. Don't duplicate it.

## Item codes and QR labels

`items.itemCode` is unique per firm ignoring case (`items_firm_code_key`) and never blank: create,
edit and import all go through `resolveItemCode` (`src/server/item-code.ts`), which turns a blank
code into `ITM<id>`. A label's QR encodes `<origin>/i/<code>`, never a price. Anything reading a
scan runs it through `codeFromScan` (`src/lib/item-code.ts`) so a bare barcode and a label URL
resolve the same way.

## Client data

RTK Query with tag-based invalidation; the whole cache is persisted via redux-persist. When you
add a mutation, invalidate the tags it actually touches — anything moving money or stock should
include the `DERIVED` list in `src/store/api.ts`.

## React conventions in this codebase

The lint config runs the React Compiler rules as errors. Two consequences:

- Don't sync state from props/data with `useEffect`. Either derive it during render, or mount the
  component fresh with a `key` and use a `useState` initialiser. Modals here are mounted
  conditionally and keyed by record id for exactly this reason.
- Master-detail selection uses `useSelection` (`src/lib/useSelection.ts`), which derives the
  fallback to the first row instead of pushing it in from an effect.

## Before you call it done

```bash
npm run typecheck && npm run lint && npm run build
```

There is an end-to-end ledger test that exercises posting, editing, deleting, allocation, tax
handling and the reports against a running dev server. Keep it passing.

## Keep the app guide in step

`docs/app-guide-ane-test-cases.md` (Gujarati) documents every screen, what each button does,
where each action is reflected, the test cases and the known issues. Any change to a screen, a
button or a posting rule updates it in the same piece of work: the screen section, the "કઈ ક્રિયાથી
ક્યાં અસર" table, the test cases, and a dated row in "ફેરફારની નોંધ". A fixed known issue (KI-xx)
moves out of the issues table into that change log.
