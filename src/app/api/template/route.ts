import { buildSampleWorkbook, buildTemplateWorkbook } from "@/lib/template";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "sample" ? "sample" : "template";
  const today = new Date();

  const buffer =
    kind === "sample" ? buildSampleWorkbook(today) : buildTemplateWorkbook(today);
  const filename =
    kind === "sample"
      ? `FIRM-Sample-Fleet-${today.toISOString().slice(0, 10)}.xlsx`
      : "FIRM-Fleet-Import-Template.xlsx";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
