import { CalendarClock, CircleAlert, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import {
  APPROVAL_MATRIX, CONFLICT_RULES, SAP_FIELDS, UPLOAD_FIELDS,
} from "@/lib/firm/workflow";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Rules & settings"
        description="The business rules from the FIRM document shown as reference. The workflow store lives in .data/firm-workflow.json and is seeded on first run."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card p-4">
          <h2 className="flex items-center gap-2 panel-title"><FileSpreadsheet size={15} className="text-brand" /> Upload template fields</h2>
          <p className="panel-subtitle mt-1">The only crane data the team enters at upload.</p>
          <div className="mt-3 space-y-2">
            {UPLOAD_FIELDS.map((field) => (
              <div key={field.key} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <span className="text-[12px] font-semibold text-ink">{field.label}</span>
                <span className="text-right text-[10.5px] text-muted">{field.hint}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-line px-2.5 py-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-faint">SAP fields (entered manually in this build)</div>
            <ul className="mt-1.5 space-y-1">
              {SAP_FIELDS.map((field) => <li key={field} className="text-[11px] text-muted">· {field}</li>)}
            </ul>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="flex items-center gap-2 panel-title"><CalendarClock size={15} className="text-brand" /> Proposed windows</h2>
          <p className="panel-subtitle mt-1">Timings in the document; confirm with CBO / CEO before production.</p>
          <div className="mt-3 space-y-2">
            {[
              ["International BU window", "20 days"],
              ["Marketing catalogue window", "5 working days"],
              ["Sale window before scrap decision", "60 days"],
              ["Conflict decision", "3 working days"],
              ["Claim-back to SO or reservation", "15 days"],
              ["Approval reminder / escalation", "3 / 5 working days"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <span className="text-[11.5px] text-muted">{label}</span>
                <span className="text-[12px] font-semibold text-ink">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="flex items-center gap-2 panel-title"><ShieldCheck size={15} className="text-brand" /> Approval matrix</h2>
          <div className="mt-3 overflow-x-auto scroll-thin">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-line text-[10px] font-bold uppercase tracking-[0.08em] text-faint">
                  <th className="py-2 pr-3">Decision</th><th className="py-2 pr-3">Prepared by</th><th className="py-2">Approved by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {APPROVAL_MATRIX.map((row) => (
                  <tr key={row.decision} className="text-[11px]">
                    <td className="py-2 pr-3 font-medium text-ink">{row.decision}</td>
                    <td className="py-2 pr-3 text-muted">{row.preparedBy}</td>
                    <td className="py-2 text-muted">{row.approvedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="flex items-center gap-2 panel-title"><CircleAlert size={15} className="text-brand" /> Conflict rules</h2>
          <div className="mt-3 space-y-2">
            {CONFLICT_RULES.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11.5px] font-semibold text-ink">{rule.title}</span>
                  <span className="badge badge-red">{rule.decidedBy}</span>
                </div>
                <div className="mt-1 text-[10.5px] text-muted">{rule.from}</div>
                <div className="mt-1 text-[10.5px] text-muted">Rental wins → {rule.rentalWins}</div>
                <div className="mt-1 text-[10.5px] text-muted">Other wins → {rule.otherWins}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
