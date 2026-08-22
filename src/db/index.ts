import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

// Neon talks Postgres over a WebSocket, which is what gives us real
// interactive transactions (the HTTP driver cannot do read-then-write).
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set — add it to .env');
}

// Reuse the pool across hot reloads in dev, otherwise every edit leaks sockets.
const globalForDb = globalThis as unknown as {
  __vyaparPool?: Pool;
  __vyaparDb?: NeonDatabase<typeof schema>;
};

const pool =
  globalForDb.__vyaparPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

export const db = globalForDb.__vyaparDb ?? drizzle(pool, { schema });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__vyaparPool = pool;
  globalForDb.__vyaparDb = db;
}

export { pool, schema };
export * from './schema';
