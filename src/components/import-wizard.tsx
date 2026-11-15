"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Lock,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { ImportSummary, PreviewRow } from "@/lib/import";
import type { ParseIssue, ParseStats } from "@/lib/excel";
import type { Policy } from "@/lib/policy";
import { inrCompact } from "@/lib/format";
import { ClassificationBadge } from "@/components/classification-badge";
import { FlagChips } from "@/components/flag-chip";
import { FileDropzone } from "@/components/file-dropzone";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RoleGate } from "@/components/role-gate";
import { InrAmount } from "@/components/inr-amount";

interface PreviewResponse {
  ok: true;
  filename: string;
  evaluationDate: string;
  policy: Policy;
  stats: ParseStats;
  issues: ParseIssue[];
  summary: ImportSummary;
  rows: PreviewRow[];
  sheetNames: string[];
}

interface ApiError {
  ok: false;
  message: string;
  issues?: ParseIssue[];
  stats?: ParseStats;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const STEPS = [
  { key: 1, label: "Upload" },
  { key: 2, label: "Validate" },
  { key: 3, label: "Commit" },
];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Import progress">
      {STEPS.map((entry, index) => {
        const done = step > entry.key;
        const current = step === entry.key;
        return (
          <li key={entry.key} className="flex items-center gap-2">
            <span
              className={`flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[10.5px] font-semibold ${
                done
                  ? "border-healthy/30 bg-healthy-soft text-healthy-ink"
                  : current
                    ? "border-brand/30 bg-brand-soft text-brand-ink"
                    : "border-line bg-panel-2 text-faint"
              }`}
            >
              {done ? <CheckCircle2 size={11} /> : <span className="mono">{entry.key}</span>}
              {entry.label}
            </span>
            {index < STEPS.length - 1 && <ChevronRight size={12} className="text-line-strong" />}
          </li>
        );
      })}
    </ol>
  );
}

export function ImportWizard({ canCommit, role }: { canCommit: boolean; role: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [evaluationDate, setEvaluationDate] = useState(todayIso());
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const errorIssues = useMemo(
    () => preview?.issues.filter((issue) => issue.severity === "error") ?? [],
    [preview],
  );
  const warningIssues = useMemo(
    () => preview?.issues.filter((issue) => issue.severity === "warning") ?? [],
    [preview],
  );

  const step = preview ? 3 : file ? 2 : 1;

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
  }

  function chooseFile(next: File | null) {
    setError(null);
    setPreview(null);
    setFile(next);
  }

  async function submit(mode: "preview" | "commit") {
    if (!file) {
      setError("Choose an Excel workbook first.");
      return;
    }
    if (!evaluationDate) {
      setError("Select the evaluation date.");
      return;
    }

    setBusy(mode);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("mode", mode);
      body.set("evaluationDate", evaluationDate);

      const response = await fetch("/api/import", { method: "POST", body });
      const payload = (await response.json()) as PreviewResponse | ApiError;

      if (!response.ok || payload.ok === false) {
        const failure = payload as ApiError;
        setError(failure.message ?? "The workbook could not be processed.");
        toast.error("Workbook validation failed", {
          description: failure.message ?? "The workbook could not be processed.",
        });
        if (failure.stats) {
          setPreview((current) =>
            current
              ? {
                  ...current,
                  stats: failure.stats!,
                  issues: failure.issues ?? current.issues,
                }
              : current,
          );
        }
        return;
      }

      if (mode === "preview") {
        setPreview(payload as PreviewResponse);
        toast.success("Workbook validated", {
          description: "Review the issues and classification preview before committing.",
        });
      } else {
        const result = payload as unknown as { runId: number };
        toast.success(`Evaluation run #${result.runId} created`, {
          description: "The fleet register and dashboard now reflect this evaluation.",
        });
        router.push(`/runs/${result.runId}`);
      }
    } catch {
      setError("A network error occurred while uploading the workbook.");
      toast.error("Upload failed", {
        description: "A network error occurred while uploading the workbook.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Stepper step={step} />
        <div className="flex flex-wrap gap-2">
          <a href="/api/template?kind=template" className="btn btn-secondary btn-sm">
            <Download size={13} /> Blank template
          </a>
          <a href="/api/template?kind=sample" className="btn btn-secondary btn-sm">
            <Download size={13} /> Sample fleet
          </a>
        </div>
      </div>

      <section className="card p-4" aria-labelledby="upload-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="upload-title" className="panel-title">
              1 · Choose the workbook
            </h2>
            <p className="panel-subtitle mt-0.5">
              Excel (.xlsx) with Fleet Master, Annual Performance and Retention Assessment
              sheets. Only Fleet Master is mandatory.
            </p>
          </div>
          {file && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={reset}
              disabled={busy != null}
            >
              <RotateCcw size={12} /> Clear
            </button>
          )}
        </div>

        <div className="mt-3">
          <FileDropzone file={file} onFile={chooseFile} />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-[220px]">
            <label className="label" htmlFor="evaluationDate">
              Evaluation date
            </label>
            <input
              id="evaluationDate"
              type="date"
              className="input"
              value={evaluationDate}
              max={todayIso()}
              onChange={(event) => {
                setEvaluationDate(event.target.value);
                setPreview(null);
              }}
            />
            <p className="field-hint">Defaults to today. It cannot be in the future.</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!file || busy != null}
            onClick={() => submit("preview")}
          >
            {busy === "preview" ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Validating…
              </>
            ) : (
              <>
                <ShieldCheck size={14} /> Validate workbook
              </>
            )}
          </button>
        </div>

        <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
          The evaluation date drives the Old Fleet age test, the certificate lapse test and the
          trailing financial years used for the NRG test. Nothing is written until you commit.
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--nd)_30%,transparent)] bg-nd-soft px-4 py-3"
        >
          <XCircle size={16} className="mt-0.5 shrink-0 text-nd" />
          <div className="text-[12.5px] leading-relaxed text-nd-ink">{error}</div>
        </div>
      )}

      {preview && (
        <PreviewPanel
          preview={preview}
          errorIssues={errorIssues}
          warningIssues={warningIssues}
          canCommit={canCommit}
          role={role}
          committing={busy === "commit"}
          onCommit={() => submit("commit")}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2 px-3 py-2.5">
      <div className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-faint">{label}</div>
      <div className={`mono mt-0.5 text-[16px] font-semibold ${tone ?? "text-ink"}`}>{value}</div>
    </div>
  );
}

function PreviewPanel({
  preview,
  errorIssues,
  warningIssues,
  canCommit,
  role,
  committing,
  onCommit,
}: {
  preview: PreviewResponse;
  errorIssues: ParseIssue[];
  warningIssues: ParseIssue[];
  canCommit: boolean;
  role: string;
  committing: boolean;
  onCommit: () => void;
}) {
  const { stats, summary } = preview;
  const blocked = stats.errorCount > 0;
  const [filter, setFilter] = useState<"all" | "error" | "warning">("all");

  const visibleIssues =
    filter === "error" ? errorIssues : filter === "warning" ? warningIssues : [...errorIssues, ...warningIssues];

  return (
    <>
      <section className="card p-4" aria-labelledby="validation-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="validation-title" className="panel-title">
              2 · Validation result
            </h2>
            <p className="panel-subtitle mt-0.5">
              {preview.filename} · evaluation as of {preview.evaluationDate}
            </p>
          </div>
          <span className={`badge ${blocked ? "badge-nd" : "badge-healthy"}`}>
            {blocked ? `${stats.errorCount} errors — cannot commit` : "Ready to commit"}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard label="Assets" value={stats.assetCount} />
          <StatCard label="Performance rows" value={stats.performanceRows} />
          <StatCard label="Retention rows" value={stats.retentionRows} />
          <StatCard
            label="Models used"
            value={
              <>
                {stats.modelsUsed}
                <span className="ml-1 text-[10px] font-normal text-faint">
                  ({stats.unknownModels} unknown)
                </span>
              </>
            }
          />
          <StatCard
            label="Errors"
            value={stats.errorCount}
            tone={stats.errorCount > 0 ? "text-nd-ink" : undefined}
          />
          <StatCard
            label="Warnings"
            value={stats.warningCount}
            tone={stats.warningCount > 0 ? "text-warning-ink" : undefined}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px]">
          <span className="badge badge-nd">{summary.nonDeployable} Non-Deployable</span>
          <span className="badge badge-nrg">{summary.nrg} NRG confirmed</span>
          <span className="badge badge-amber">{summary.nrgReview} NRG review</span>
          <span className="badge badge-old">{summary.oldFleet} Old Fleet</span>
          <span className="badge badge-healthy">{summary.healthy} Healthy</span>
          <span className="badge badge-slate">
            {inrCompact(summary.replacementCapexTotal)} replacement capex
          </span>
          {summary.potentialNrg > 0 && (
            <span className="badge badge-amber">{summary.potentialNrg} retention pending</span>
          )}
          {summary.insufficientNrg > 0 && (
            <span className="badge badge-slate">{summary.insufficientNrg} NRG not testable</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel-2 px-3 py-2">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-faint">
            Detected sheets
          </span>
          {preview.sheetNames.length === 0 ? (
            <span className="text-[11px] text-muted">No sheets detected</span>
          ) : (
            preview.sheetNames.map((sheet) => (
              <span key={sheet} className="badge badge-slate">
                <FileSpreadsheet size={10} /> {sheet}
              </span>
            ))
          )}
        </div>

        <div className="mt-3 grid gap-2 text-[10.5px] text-muted sm:grid-cols-3">
          <div className="rounded-lg border border-line px-2.5 py-1.5">
            Old Fleet age &gt; <strong className="text-ink">{preview.policy.oldFleetYears}</strong> yrs
          </div>
          <div className="rounded-lg border border-line px-2.5 py-1.5">
            NRG &lt; <strong className="text-ink">{preview.policy.nrgUtilPct}%</strong> utilisation
            and &lt; <strong className="text-ink">{preview.policy.nrgYieldPct}%</strong> yield for{" "}
            <strong className="text-ink">{preview.policy.nrgYears}</strong> yrs
          </div>
          <div className="rounded-lg border border-line px-2.5 py-1.5">
            Repair &gt; <strong className="text-ink">{preview.policy.repairPct}%</strong> of capex ·
            grace <strong className="text-ink">{preview.policy.certGraceDays}</strong> days
          </div>
        </div>
      </section>

      {(errorIssues.length > 0 || warningIssues.length > 0) && (
        <section className="card overflow-hidden" aria-labelledby="issues-title">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div>
              <h2 id="issues-title" className="panel-title">
                Data issues
              </h2>
              <p className="panel-subtitle mt-0.5">
                Errors block the commit. Warnings are imported with a data-quality flag.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-line bg-panel-2 p-0.5">
              {(
                [
                  { key: "all", label: "All", count: errorIssues.length + warningIssues.length },
                  { key: "error", label: "Errors", count: errorIssues.length },
                  { key: "warning", label: "Warnings", count: warningIssues.length },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`rounded-md px-2 py-1 text-[10.5px] font-semibold transition ${
                    filter === tab.key
                      ? "bg-panel text-ink shadow-[var(--shadow-sm)]"
                      : "text-faint hover:text-ink"
                  }`}
                >
                  {tab.label} <span className="mono">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[340px] divide-y divide-line overflow-y-auto scroll-thin">
            {visibleIssues.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12px] text-muted">
                No issues in this filter.
              </p>
            ) : (
              visibleIssues.map((issue, index) => (
                <div
                  key={`${issue.code}-${issue.row}-${index}`}
                  className="flex items-start gap-2.5 px-4 py-2.5"
                >
                  {issue.severity === "error" ? (
                    <XCircle size={14} className="mt-0.5 shrink-0 text-nd" />
                  ) : (
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium text-ink">
                      <span className="badge badge-slate">{issue.sheet}</span>
                      {issue.row != null && (
                        <span className="text-[10px] text-faint">row {issue.row}</span>
                      )}
                      {issue.field && <span className="text-[10px] text-faint">{issue.field}</span>}
                    </div>
                    <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                      {issue.message}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      <section className="card overflow-hidden" aria-labelledby="preview-title">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 id="preview-title" className="panel-title">
              3 · Classification preview
            </h2>
            <p className="panel-subtitle mt-0.5">
              Computed with the current policy before anything is saved.
            </p>
          </div>
          <span className="badge badge-slate">{preview.rows.length} assets</span>
        </div>
        <div className="table-wrap scroll-thin max-h-[520px] overflow-y-auto">
          <table className="data">
            <thead className="sticky top-0 z-10">
              <tr>
                <th>Asset</th>
                <th>Model</th>
                <th className="text-right">Age</th>
                <th>Region / location</th>
                <th className="text-right">Capex</th>
                <th className="text-right">Util</th>
                <th className="text-right">Yield</th>
                <th>Flags</th>
                <th>Primary class</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.assetCode}>
                  <td>
                    <div className="font-mono text-[11.5px] font-semibold text-ink">
                      {row.assetCode}
                    </div>
                    <div className="mt-0.5 max-w-[220px] truncate text-[10px] text-faint">
                      {row.description ?? row.model}
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-muted">{row.model}</td>
                  <td className="mono whitespace-nowrap text-right">
                    {row.ageYears}
                    {row.ageThreshold != null && (
                      <span className="ml-1 text-[10px] text-faint">/ {row.ageThreshold}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-muted">
                    {row.region ?? "—"}
                    {row.location ? <div className="text-[10px] text-faint">{row.location}</div> : null}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <InrAmount value={row.replacementCapex} compact />
                  </td>
                  <td className="mono whitespace-nowrap text-right">
                    {row.utilisationAvgPct != null ? `${row.utilisationAvgPct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="mono whitespace-nowrap text-right">
                    {row.monthlyYieldAvgPct != null ? `${row.monthlyYieldAvgPct.toFixed(2)}%` : "—"}
                  </td>
                  <td>
                    <FlagChips
                      oldFleet={row.oldFleet}
                      nonDeployable={row.nonDeployable}
                      nrg={row.nrg}
                      nrgStatus={row.nrgStatus}
                    />
                  </td>
                  <td>
                    <ClassificationBadge value={row.primaryClass} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-4" aria-labelledby="commit-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="commit-title" className="panel-title">
              4 · Commit
            </h2>
            <p className="panel-subtitle mt-0.5">
              Commit saves the fleet master, performance and retention data, classifies every
              crane and creates an immutable evaluation run.
            </p>
          </div>
          <span className={`badge ${blocked ? "badge-nd" : "badge-healthy"}`}>
            {blocked ? "Blocked by errors" : "All checks passed"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel-2 px-3 py-3">
          {canCommit ? (
            <ConfirmDialog
              title="Commit this import?"
              description={
                <>
                  This will upsert <strong>{stats.assetCount}</strong> assets, create a new
                  evaluation run and classify the fleet with the current policy. The run then
                  needs Prepared → Reviewed → Approved sign-off.
                </>
              }
              confirmLabel="Commit & classify"
              tone="primary"
              onConfirm={onCommit}
              trigger={
                <button type="button" className="btn btn-primary" disabled={blocked || committing}>
                  {committing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Committing…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Commit import &amp; run classification
                    </>
                  )}
                </button>
              }
            />
          ) : (
            <RoleGate
              role={role}
              allow={["PREPARER"]}
              mode="disable"
              reason="Only a Preparer or Administrator can commit an import. You can still validate workbooks and download the template."
            >
              <button type="button" className="btn btn-primary" disabled>
                <Lock size={14} /> Commit import
              </button>
            </RoleGate>
          )}
          <p className="max-w-md text-[11px] leading-relaxed text-muted">
            {blocked
              ? "Resolve the validation errors above, then upload the corrected workbook. Commit is impossible while any error remains."
              : canCommit
                ? "On commit the fleet register and dashboard update immediately, and the new run appears in Approvals."
                : "Validation is available to every role. Committing an import requires the Preparer or Administrator role."}
          </p>
        </div>

        <div className="mt-3 grid gap-2 text-[10.5px] text-muted sm:grid-cols-3">
          <div className="flex items-start gap-1.5">
            <UploadCloud size={12} className="mt-0.5 shrink-0 text-brand" />
            Existing assets are upserted by Asset Code; new codes are created.
          </div>
          <div className="flex items-start gap-1.5">
            <ShieldCheck size={12} className="mt-0.5 shrink-0 text-brand" />
            A new run is created with a policy snapshot and a full reason trail.
          </div>
          <div className="flex items-start gap-1.5">
            <FileSpreadsheet size={12} className="mt-0.5 shrink-0 text-brand" />
            The audit log records the upload, commit and every sign-off action.
          </div>
        </div>

        {!blocked && preview.rows.length > 0 && (
          <p className="mt-2 text-[10.5px] text-faint">
            Preview sample: {preview.rows[0].assetCode} classified{" "}
            {preview.rows[0].primaryClass.replace(/_/g, " ")}.{" "}
            <Link href="/assets" className="font-semibold text-brand">
              Browse the current register
            </Link>
          </p>
        )}
      </section>
    </>
  );
}
