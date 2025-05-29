import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// Lazy connection - only fails when actually used, not during build
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    const client = postgres(env.DATABASE_URL);
    _db = drizzle(client, { schema });
  }
  return _db;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = new Proxy({} as any, {
  get(target, prop: string | symbol) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  }
});
