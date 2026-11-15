import path from "node:path";
import { mkdir } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { DDL } from "./ddl";
import * as schema from "./schema";
import { hashPassword } from "@/lib/password";
import { POLICY_DEFAULTS } from "@/lib/policy";

/**
 * Both drivers expose the same Drizzle query API, so the rest of the app is
 * database-agnostic. Local development uses embedded PGlite (PostgreSQL in
 * WASM); production uses a real PostgreSQL server via DATABASE_URL.
 */
export type Database = PgDatabase<any, typeof schema>;

type DbGlobal = typeof globalThis & { __firmDb?: Promise<Database> };
const globalForDb = globalThis as DbGlobal;

export function getDb(): Promise<Database> {
  if (!globalForDb.__firmDb) {
    globalForDb.__firmDb = initDb().catch((error) => {
      globalForDb.__firmDb = undefined;
      throw error;
    });
  }
  return globalForDb.__firmDb;
}

async function initDb(): Promise<Database> {
  const url = process.env.DATABASE_URL?.trim();
  let db: Database;

  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url, max: 10 });
    db = drizzle(pool, { schema }) as unknown as Database;
    await pool.query(DDL);
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const dir =
      process.env.PGLITE_DIR?.trim() || path.join(process.cwd(), ".data", "pglite");
    await mkdir(dir, { recursive: true });
    const client = new PGlite(dir);
    await client.waitReady;
    db = drizzle(client, { schema }) as unknown as Database;
    await client.exec(DDL);
  }

  await seed(db);
  return db;
}

const SEED_USERS = [
  {
    name: "System Administrator",
    email: "admin@firm.local",
    password: "Admin@12345",
    role: "ADMIN",
    designation: "System Administrator",
  },
  {
    name: "Satish Irale",
    email: "satish.irale@firm.local",
    password: "Firm@12345",
    role: "PREPARER",
    designation: "AVP - SCM",
  },
  {
    name: "Prajwal Kumar",
    email: "prajwal.kumar@firm.local",
    password: "Firm@12345",
    role: "REVIEWER",
    designation: "CBO",
  },
  {
    name: "Abhijeet Sawarkar",
    email: "abhijeet.sawarkar@firm.local",
    password: "Firm@12345",
    role: "REVIEWER",
    designation: "VP",
  },
  {
    name: "R. Manoj",
    email: "r.manoj@firm.local",
    password: "Firm@12345",
    role: "REVIEWER",
    designation: "VP",
  },
  {
    name: "Gaurang Desai",
    email: "gaurang.desai@firm.local",
    password: "Firm@12345",
    role: "APPROVER",
    designation: "CEO",
  },
  {
    name: "Rishi Sanghvi",
    email: "rishi.sanghvi@firm.local",
    password: "Firm@12345",
    role: "APPROVER",
    designation: "MD",
  },
];

async function seed(db: Database): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.users);

  if (Number(count) === 0) {
    await db
      .insert(schema.users)
      .values(
        SEED_USERS.map((user) => ({
          name: user.name,
          email: user.email,
          passwordHash: hashPassword(user.password),
          role: user.role,
          designation: user.designation,
        })),
      )
      .onConflictDoNothing();
  }

  const existing = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "policy"));

  if (existing.length === 0) {
    await db
      .insert(schema.settings)
      .values({ key: "policy", value: JSON.stringify(POLICY_DEFAULTS) })
      .onConflictDoNothing();
  }
}
