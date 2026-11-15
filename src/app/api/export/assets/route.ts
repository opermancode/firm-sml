import { getDb } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { exportAssets, getLatestRun } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cell(value: unknown): string {
  if (value == null) return "";
  const raw = String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const params = url.searchParams;
  const db = await getDb();
  const [rows, run] = await Promise.all([
    exportAssets(db, {
      q: params.get("q") ?? undefined,
      classification: params.get("classification") ?? undefined,
      region: params.get("region") ?? undefined,
      model: params.get("model") ?? undefined,
      sort: params.get("sort") ?? undefined,
      data: params.get("data") ?? undefined,
    }),
    getLatestRun(db),
  ]);

  const header = [
    "Asset Code",
    "Description",
    "Model",
    "OEM",
    "Category",
    "Capacity (MT)",
    "YOM",
    "Age (years)",
    "Age threshold (years)",
    "Region",
    "Location",
    "Current status",
    "Replacement capex (INR)",
    "Utilisation 3Y avg (%)",
    "Monthly yield 3Y avg (%)",
    "Old Fleet",
    "Non-Deployable",
    "NRG status",
    "Primary classification",
    "Critical findings",
    "Warnings",
  ];

  const lines = [header.map(cell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.code,
        row.description,
        row.model,
        row.oem,
        row.category,
        row.capacityMt,
        row.yom,
        row.ageYears,
        row.ageThreshold,
        row.region,
        row.location,
        row.currentStatus,
        row.replacementCapex,
        row.utilisationAvgPct,
        row.monthlyYieldAvgPct,
        row.oldFleet ? "Yes" : "No",
        row.nonDeployable ? "Yes" : "No",
        row.nrgStatus,
        row.primaryClass,
        row.criticalCount,
        row.warningCount,
      ]
        .map(cell)
        .join(","),
    );
  }

  const body = `\uFEFF${lines.join("\r\n")}\r\n`;
  const filename = `FIRM-Fleet-${
    run?.evaluationDate ?? new Date().toISOString().slice(0, 10)
  }.csv`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
