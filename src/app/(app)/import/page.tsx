import { ArrowRight, FileSpreadsheet, ShieldCheck, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { ROLE_MAP, UPLOAD_FIELDS, SAP_UPLOAD_FIELDS, type Role } from "@/lib/firm/workflow";
import { PageHeader } from "@/components/page-header";
import { ImportWizard } from "@/components/import-wizard";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await requireUser();
  const role = ROLE_MAP[user.role as Role];
  const canCommit = user.role === "FPNA" || user.role === "GLOBAL_ADMIN";

  return (
    <>
      <PageHeader
        eyebrow="FIRM cycle"
        title="Upload fleet"
        description="FP&A opens the cycle with the standard workbook. Validate first — errors block the commit. Once committed, Sales and Maintenance checks open together for every crane."
        help="The template has five crane fields and four SAP/SO fields. SO End Date becomes Execution allowed from, and errors block the commit."
      />

      <div className="grid gap-4 xl:grid-cols-[1.85fr_1fr]">
        <ImportWizard role={user.role} />

        <div className="space-y-4">
          <section className="card p-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={15} className="text-brand" />
              <h2 className="panel-title">What the workbook needs</h2>
            </div>
            <ol className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-muted">
              {UPLOAD_FIELDS.map((field, index) => (
                <li key={field.key}>
                  <span className="font-semibold text-ink">{index + 1} · {field.label}</span> (mandatory)
                  <br />{field.hint}
                </li>
              ))}
              {SAP_UPLOAD_FIELDS.map((field) => (
                <li key={field.key}>
                  <span className="font-semibold text-ink">{field.label}</span> (SAP, entered manually here)
                  <br />{field.values}
                </li>
              ))}
            </ol>
          </section>

          <section className="card p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-brand" />
              <h2 className="panel-title">What happens on commit</h2>
            </div>
            <ul className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-muted">
              <li>· Age and the Old Fleet flag are derived from YOM automatically.</li>
              <li>· Every crane enters S01 — pending parallel Sales and Maintenance validation.</li>
              <li>· SO End Date becomes “Execution allowed from” and blocks any new SO or transfer until that date.</li>
              <li>· The upload and every later decision are written to the audit trail.</li>
            </ul>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-panel-2 px-2.5 py-2 text-[11px] text-muted">
              <ArrowRight size={13} className="text-brand" />
              Next: Finance deduplicates, then Old Fleet / NRG go to international rental and Non-Deployable goes straight to sale.
            </div>
          </section>

          <section className="card p-4">
            <div className="flex items-center gap-2">
              <UserRound size={15} className="text-brand" />
              <h2 className="panel-title">Your access</h2>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-line bg-panel-2 px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-ink">{user.name}</div>
                <div className="truncate text-[10.5px] text-muted">{user.designation ?? user.email}</div>
              </div>
              <span className="badge badge-brand">{role?.short ?? user.role}</span>
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
              {canCommit
                ? "You can validate and commit fleet uploads and open the cycle."
                : "You can inspect the template and validation rules. Committing a fleet requires the FP&A or Global Administrator role."}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
