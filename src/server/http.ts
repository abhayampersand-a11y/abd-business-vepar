import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { NotFoundError } from './txn-service';

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);

export const created = <T>(data: T) => NextResponse.json(data, { status: 201 });

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Wraps a route handler so every failure comes back as JSON the client can
 * render, instead of an opaque 500 HTML page.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return fail(first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input', 422, {
          issues: err.issues,
        });
      }
      if (err instanceof NotFoundError) return fail(err.message, 404);

      const message = err instanceof Error ? err.message : 'Unexpected server error';
      if (/duplicate key/i.test(message)) {
        return fail('That record already exists — try a different number or name.', 409);
      }
      console.error('[api]', err);
      return fail(message, 500);
    }
  };
}

/** Reads and coerces the common list query params. */
export function listParams(url: URL) {
  const n = (k: string) => {
    const v = url.searchParams.get(k);
    return v ? Number(v) : undefined;
  };
  return {
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    partyId: n('partyId'),
    limit: n('limit'),
    offset: n('offset'),
  };
}
