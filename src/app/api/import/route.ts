import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getSessionUser, hasRole } from "@/lib/auth";
import { getPolicy } from "@/lib/policy-store";
import { parseFleetWorkbook } from "@/lib/excel";
import { commitImport, previewWorkbook } from "@/lib/import";
import { toDateOnly } from "@/lib/classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BYTES = 12 * 1024 * 1024;

function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail("You must be signed in to import fleet data.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("The upload could not be read. Please try again.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return fail("Choose an Excel workbook (.xlsx) to upload.");
  }
  if (file.size === 0) {
    return fail("The selected file is empty.");
  }
  if (file.size > MAX_BYTES) {
    return fail("The workbook is larger than 12 MB. Split the fleet into smaller files.");
  }
  if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
    return fail("Unsupported file type. Upload an Excel workbook (.xlsx).");
  }

  const mode = String(form.get("mode") ?? "preview");
  if (mode !== "preview" && mode !== "commit") {
    return fail("Unknown import mode.");
  }
  if (mode === "commit" && !hasRole(user, "PREPARER")) {
    return fail("Only a Preparer (or Administrator) can commit an import.", 403);
  }

  const dateRaw = String(form.get("evaluationDate") ?? "").trim();
  const evaluationDate = dateRaw ? toDateOnly(dateRaw) : toDateOnly(new Date());
  if (!evaluationDate) {
    return fail("Enter a valid evaluation date (YYYY-MM-DD).");
  }
  const today = toDateOnly(new Date());
  if (today && evaluationDate.getTime() > today.getTime()) {
    return fail("The evaluation date cannot be in the future.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = parseFleetWorkbook(buffer, { evaluationDate });
  } catch (error) {
    return fail(
      error instanceof Error
        ? `The workbook could not be parsed: ${error.message}`
        : "The workbook could not be parsed.",
    );
  }

  if (parsed.fatal) {
    return fail("The workbook did not pass validation.", 422, {
      issues: parsed.issues,
      stats: parsed.stats,
    });
  }

  const db = await getDb();
  const policy = await getPolicy(db);
  const preview = previewWorkbook(parsed, policy, evaluationDate);

  if (mode === "preview") {
    return NextResponse.json({
      ok: true,
      mode,
      filename: file.name,
      evaluationDate: evaluationDate.toISOString().slice(0, 10),
      policy,
      stats: parsed.stats,
      issues: parsed.issues,
      summary: preview.summary,
      rows: preview.rows,
      sheetNames: parsed.sheetNames,
    });
  }

  if (parsed.stats.errorCount > 0) {
    return fail(
      `Fix the ${parsed.stats.errorCount} validation error${
        parsed.stats.errorCount === 1 ? "" : "s"
      } before committing. Nothing has been saved.`,
      422,
      { issues: parsed.issues, stats: parsed.stats },
    );
  }

  try {
    const result = await commitImport(db, {
      parsed,
      filename: file.name,
      evaluationDate,
      actor: { id: user.id, name: user.name },
    });

    return NextResponse.json({
      ok: true,
      mode,
      runId: result.runId,
      uploadId: result.uploadId,
      summary: result.summary,
    });
  } catch (error) {
    console.error("Import failed", error);
    return fail(
      error instanceof Error
        ? `The import failed while saving: ${error.message}`
        : "The import failed while saving.",
      500,
    );
  }
}
