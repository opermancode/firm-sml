/**
 * Seeds the embedded database with the demo fleet.
 *
 *   npm run seed:demo
 *
 * Parses the same sample workbook that the app offers for download and runs it
 * through the real import pipeline, so the demo data exercises validation,
 * classification, run creation and the audit trail exactly like a user upload.
 */
import { getDb } from "../src/db";
import { parseFleetWorkbook } from "../src/lib/excel";
import { buildSampleWorkbook } from "../src/lib/template";
import { commitImport } from "../src/lib/import";
import { users } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  const db = await getDb();

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  if (Number(count) === 0) {
    throw new Error("Users were not seeded. Check the database configuration.");
  }

  const adminRows = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@firm.local"))
    .limit(1);
  const actor = adminRows[0];
  if (!actor) throw new Error("admin@firm.local was not found.");

  const evaluationDate = new Date();
  const buffer = buildSampleWorkbook(evaluationDate);
  const parsed = parseFleetWorkbook(buffer, { evaluationDate });

  if (parsed.fatal) {
    console.error(parsed.issues);
    throw new Error("Sample workbook failed validation.");
  }

  const errors = parsed.issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    console.error(errors);
    throw new Error(`Sample workbook has ${errors.length} validation errors.`);
  }

  const result = await commitImport(db, {
    parsed,
    filename: "FIRM-Sample-Fleet.xlsx",
    evaluationDate,
    actor: { id: actor.id, name: actor.name },
  });

  console.log("Demo fleet seeded.");
  console.log(`  assets:          ${result.summary.total}`);
  console.log(`  old fleet:       ${result.summary.oldFleet}`);
  console.log(`  non-deployable:  ${result.summary.nonDeployable}`);
  console.log(`  NRG:             ${result.summary.nrg}`);
  console.log(`  potential NRG:   ${result.summary.potentialNrg}`);
  console.log(`  evaluation run:  #${result.runId}`);
  console.log("");
  console.log("Sign in with admin@firm.local / Admin@12345");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
