import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "@/db/migrate";
import * as schema from "@/db/schema";
import type { Database } from "@/domain/db";

const globalDb = globalThis as unknown as {
  noteaPool?: Pool;
  noteaDb?: Database;
  noteaReady?: boolean;
  noteaBoot?: Promise<Database>;
};

export function databaseUrl() {
  return process.env.DATABASE_URL ?? "postgres://notea@127.0.0.1:5433/notea";
}

function pool() {
  if (!globalDb.noteaPool) globalDb.noteaPool = new Pool({ connectionString: databaseUrl() });
  return globalDb.noteaPool;
}

export function getDb() {
  if (!globalDb.noteaDb) globalDb.noteaDb = drizzle(pool(), { schema });
  return globalDb.noteaDb;
}

export function ready() {
  if (globalDb.noteaReady && globalDb.noteaDb) return Promise.resolve(globalDb.noteaDb);
  if (!globalDb.noteaBoot) {
    globalDb.noteaBoot = boot().catch((error) => {
      globalDb.noteaBoot = undefined;
      throw error;
    });
  }
  return globalDb.noteaBoot;
}

async function boot() {
  const client = await pool().connect();
  try {
    await client.query("SELECT pg_advisory_lock(840021)");
    const locked = drizzle(client, { schema });
    await migrate(locked);
    if (process.env.VITEST !== "true" && process.env.NOTEA_SEED !== "0") {
      const { seedIfEmpty } = await import("@/db/seed");
      await seedIfEmpty(locked);
    }
    globalDb.noteaReady = true;
  } finally {
    await client.query("SELECT pg_advisory_unlock(840021)").catch(() => undefined);
    client.release();
  }
  return getDb();
}
