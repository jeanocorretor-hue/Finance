import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL must be set in Environment Variables.",
      );
    }
    const isProduction =
      process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
    _pool = new Pool({
      connectionString,
      ...(isProduction ? { ssl: { rejectUnauthorized: false } } : {}),
    });
  }
  return _pool;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop, receiver) {
    const instance = getPool();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export * from "./schema";
