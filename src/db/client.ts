import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "@/db/migrate";
import * as schema from "@/db/schema";
import type { Database } from "@/domain/db";

const globalDb = globalThis as unknown as { noteaPool?: Pool; noteaDb?: Database; noteaReady?: boolean };

export function databaseUrl() {
  return process.env.DATABASE_URL ?? "postgres://notea@127.0.0.1:5433/notea";
}

export function getDb() {
  if (!globalDb.noteaDb) {
    const pool = new Pool({ connectionString: databaseUrl() });
    globalDb.noteaPool = pool;
    globalDb.noteaDb = drizzle(pool, { schema });
  }
  return globalDb.noteaDb;
}

export async function ready() {
  const db = getDb();
  if (!globalDb.noteaReady) {
    await migrate(db);
    globalDb.noteaReady = true;
    if (process.env.VITEST !== "true" && process.env.NOTEA_SEED !== "0") {
      const { seedIfEmpty } = await import("@/db/seed");
      await seedIfEmpty(db);
    }
  }
  return db;
}
