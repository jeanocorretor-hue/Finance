import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import * as schema from "./schema";

const { Pool } = pg;

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://xuoqjqmbyryrkjkvlyyg.supabase.co";
    const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (url && key) {
      _supabase = createClient(url, key);
    }
  }
  return _supabase;
}

export function getPool(): pg.Pool {
  if (!_pool) {
    let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      const projectRef = "xuoqjqmbyryrkjkvlyyg";
      const pass = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD || "";
      connectionString = `postgresql://postgres.${projectRef}:${pass}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`;
    }
    const isProduction =
      process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
    _pool = new Pool({
      connectionString,
      max: 1, // Serverless: keep connections minimal for pgBouncer transaction mode
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
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
