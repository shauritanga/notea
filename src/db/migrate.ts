import { sql } from "drizzle-orm";
import { migrationSql } from "@/db/sql";
import type { Database } from "@/domain/db";

export function sqlStatements(source: string) {
  return source
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export async function migrate(db: Database) {
  for (const statement of sqlStatements(migrationSql)) {
    await db.execute(sql.raw(statement));
  }
}
