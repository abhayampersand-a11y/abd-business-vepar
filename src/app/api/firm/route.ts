import { db } from '@/db';
import { firms, settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getActiveFirmId } from '@/server/firm';
import { handler, ok } from '@/server/http';
import { firmSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const [row] = await db.select().from(firms).where(eq(firms.id, firmId)).limit(1);
  return ok(row);
});

export const PUT = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const body = firmSchema.parse(await request.json());

  const [row] = await db
    .update(firms)
    .set({
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      gstin: body.gstin ?? null,
      businessType: body.businessType ?? null,
      businessCategory: body.businessCategory ?? null,
      state: body.state ?? null,
      pincode: body.pincode ?? null,
      address: body.address ?? null,
      logoUrl: body.logoUrl ?? null,
      signatureUrl: body.signatureUrl ?? null,
      booksBeginDate: body.booksBeginDate ?? null,
    })
    .where(eq(firms.id, firmId))
    .returning();

  return ok(row);
});

/** Settings are a simple key/value bag toggled from the Settings screen. */
export const PATCH = handler(async (request: Request) => {
  const firmId = await getActiveFirmId(request);
  const body = (await request.json()) as Record<string, string | boolean | number>;

  for (const [key, value] of Object.entries(body)) {
    await db
      .insert(settings)
      .values({ firmId, key, value: String(value) })
      .onConflictDoUpdate({
        target: [settings.firmId, settings.key],
        set: { value: String(value) },
      });
  }

  const rows = await db.select().from(settings).where(eq(settings.firmId, firmId));
  return ok(Object.fromEntries(rows.map((s) => [s.key, s.value])));
});
