import { db } from '@/db';
import { parties } from '@/db/schema';
import { and, eq, asc, ilike, or } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok, created } from '@/server/http';
import { partySchema } from '@/lib/validators';
import { num } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const url = new URL(request.url);
  const search = url.searchParams.get('search');
  const type = url.searchParams.get('type');

  const where = [eq(parties.firmId, firmId)];
  if (search) {
    const q = `%${search}%`;
    const clause = or(ilike(parties.name, q), ilike(parties.phone, q), ilike(parties.gstin, q));
    if (clause) where.push(clause);
  }
  if (type && type !== 'all') {
    const clause = or(eq(parties.partyType, type as never), eq(parties.partyType, 'both'));
    if (clause) where.push(clause);
  }

  const rows = await db
    .select()
    .from(parties)
    .where(and(...where))
    .orderBy(asc(parties.name));

  return ok(rows);
});

export const POST = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const body = partySchema.parse(await request.json());

  // The opening balance seeds the running balance; "to pay" is a negative.
  const opening = num(body.openingBalance);
  const signed = body.openingBalanceType === 'to_pay' ? -opening : opening;

  const [row] = await db
    .insert(parties)
    .values({
      firmId,
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
      openingBalance: String(opening),
      openingBalanceType: body.openingBalanceType,
      openingDate: body.openingDate ?? null,
      balance: String(signed),
    })
    .returning();

  return created(row);
});
