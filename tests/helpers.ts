import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { migrate } from "@/db/migrate";
import * as schema from "@/db/schema";
import { registerIndividual, verifyContact } from "@/domain/accounts";
import type { Database } from "@/domain/db";

export async function createTestDatabase() {
  const schemaName = `t_${Math.random().toString(36).slice(2, 10)}`;
  const client = new Client({
    connectionString: process.env.DATABASE_URL_TEST ?? "postgres://notea@127.0.0.1:5433/notea_test",
  });
  await client.connect();
  await client.query(`create schema ${schemaName}`);
  await client.query(`set search_path to ${schemaName}`);
  const db = drizzle(client, { schema });
  await migrate(db);
  return {
    db,
    async close() {
      await client.query(`drop schema if exists ${schemaName} cascade`);
      await client.end();
    },
  };
}

export async function verifiedPerson(
  db: Database,
  input: { name?: string; email?: string; phone?: string } = {},
) {
  const email = input.email ?? `user-${crypto.randomUUID()}@notea.test`;
  const registered = await registerIndividual(db, {
    name: input.name ?? "Asha Juma",
    password: "secret-pass-1",
    email: input.phone ? undefined : email,
    phone: input.phone,
    termsAccepted: true,
  });
  const code = input.phone ? registered.codes.phone! : registered.codes.email!;
  const user = await verifyContact(db, registered.user.id, code);
  return { user, email, password: "secret-pass-1", token: registered.token };
}
