import { db } from '@/db';
import { parties, transactions } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, fail } from '@/server/http';
import { partySchema } from '@/lib/validators';
import { num, round2 } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (request: Request, { params }: Ctx) => {
  const firmId = await getActiveFirmId(request);
  const id = Number((await params).id);

  const [party] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.id, id), eq(parties.firmId, firmId)))
    .limit(1);
  if (!party) return fail('Party not found', 404);

  const txns = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.firmId, firmId), eq(transactions.partyId, id)))
    .orderBy(desc(transactions.txnDate), desc(transactions.id));

  return ok({ ...party, transactions: txns });
});

export const PUT = handler(async (request: Request, { params }: Ctx) => {
  const firmId = await getActiveFirmId(request);
  const id = Number((await params).id);
  const body = partySchema.parse(await request.json());

  const [existing] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.id, id), eq(parties.firmId, firmId)))
    .limit(1);
  if (!existing) return fail('Party not found', 404);

  // Shift the running balance by however much the opening balance moved.
  const oldSigned =
    existing.openingBalanceType === 'to_pay'
      ? -num(existing.openingBalance)
      : num(existing.openingBalance);
  const newOpening = num(body.openingBalance);
  const newSigned = body.openingBalanceType === 'to_pay' ? -newOpening : newOpening;
  const balance = round2(num(existing.balance) - oldSigned + newSigned);

  const [row] = await db
    .update(parties)
    .set({
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      gstin: body.gstin ?? null,
      gstType: body.gstType ?? 'unregistered',
      partyType: body.partyType,
      billingAddress: body.billingAddress ?? null,
      shippingAddress: body.shippingAddress ?? null,
      state: body.state ?? null,
      partyGroup: body.partyGroup ?? 'General',
      creditLimit: body.creditLimit != null ? String(body.creditLimit) : null,
      openingBalance: String(newOpening),
      openingBalanceType: body.openingBalanceType,
      openingDate: body.openingDate ?? null,
      balance: String(balance),
      isActive: body.isActive ?? existing.isActive,
    })
    .where(eq(parties.id, id))
    .returning();

  return ok(row);
});

export const DELETE = handler(async (request: Request, { params }: Ctx) => {
  const firmId = await getActiveFirmId(request);
  const id = Number((await params).id);

  const used = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.firmId, firmId), eq(transactions.partyId, id)))
    .limit(1);
  if (used.length) {
    return fail('This party has transactions. Delete those first, or mark the party inactive.', 409);
  }

  await db.delete(parties).where(and(eq(parties.id, id), eq(parties.firmId, firmId)));
  return ok({ id });
});
