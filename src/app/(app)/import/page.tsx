import { FileSpreadsheet, Info, ShieldCheck, UserRound } from "lucide-react";
import { requireUser, hasRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ImportWizard } from "@/components/import-wizard";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await requireUser();
  const canCommit = hasRole(user, "PREPARER");

  return (
    <>
      <PageHeader
        eyebrow="Data ingestion"
        title="Import fleet data"
        description="Upload the crane fleet workbook. Every row is validated against the approved model master and the current policy before anything is committed."
      />

      <div className="grid gap-4 xl:grid-cols-[1.85fr_1fr]">
        <ImportWizard canCommit={canCommit} role={user.role} />

        <div className="space-y-4">
          <section className="card p-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={15} className="text-brand" />
              <h2 className="panel-title">What the workbook needs</h2>
            </div>
            <ol className="mt-3 space-y-3 text-[11.5px] leading-relaxed text-muted">
              <li>
                <span className="font-semibold text-ink">1 · Fleet Master</span>
                <br />
                One row per crane. Asset Code, Model and Year of Manufacture are mandatory. Add
                capex, OEM support, spares, compliance, repair estimate and the four statutory
                certificate expiry dates.
              </li>
              <li>
                <span className="font-semibold text-ink">2 · Annual Performance</span>
                <br />
                One row per crane per financial year. Three consecutive years of available days,
                deployed days, rental revenue and capital employed are needed to test NRG
                Condition 1.
              </li>
              <li>
                <span className="font-semibold text-ink">3 · Retention Assessment</span>
                <br />
                The business team&apos;s five-year rentability view, NPV, achievable sale price and
                capital release return. Without it, a Condition 1 failure is shown as{" "}
                <span className="font-medium text-ink">Potential NRG</span>.
              </li>
            </ol>
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--info)_26%,transparent)] bg-info-soft px-3 py-2.5 text-[10.5px] leading-relaxed text-info-ink">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                Monetary cells accept plain rupees (12500000) or shorthand (1.25 Cr, 45 L). Dates
                accept YYYY-MM-DD or DD/MM/YYYY. Leave the retention evaluation date blank to use
                the evaluation date selected here.
              </span>
            </div>
          </section>

          <section className="card p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-brand" />
              <h2 className="panel-title">What happens on commit</h2>
            </div>
            <ul className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-muted">
              <li>· The fleet master is upserted by Asset Code — re-uploading updates assets.</li>
              <li>
                · Performance and retention rows are upserted by asset and financial year / date.
              </li>
              <li>· A new evaluation run is created with the policy snapshot and every reason.</li>
              <li>· The run enters the sign-off chain: Prepared → Reviewed → Approved.</li>
              <li>· The import and every later action are written to the audit trail.</li>
            </ul>
          </section>

          <section className="card p-4">
            <div className="flex items-center gap-2">
              <UserRound size={15} className="text-brand" />
              <h2 className="panel-title">Your access</h2>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-line bg-panel-2 px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-ink">{user.name}</div>
                <div className="truncate text-[10.5px] text-muted">
                  {user.designation ?? user.email}
                </div>
              </div>
              <span className="badge badge-brand">{user.role}</span>
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
              {canCommit
                ? "You can validate and commit imports, then prepare the evaluation run for review."
                : "You can validate workbooks and inspect the preview. Committing an import requires the Preparer or Administrator role."}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
