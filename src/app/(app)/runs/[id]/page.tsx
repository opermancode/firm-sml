import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Info,
  Lock,
  ShieldCheck,
  TrendingDown,
  Truck,
} from "lucide-react";
import { getRunDetail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { ClassificationBadge } from "@/components/classification-badge";
import { FlagChips } from "@/components/flag-chip";
import { StatusBadge } from "@/components/status-badge";
import { SignOffStepper } from "@/components/sign-off-stepper";
import { SignOffPanel } from "@/components/sign-off-panel";
import { SignOffTimeline } from "@/components/sign-off-timeline";
import { InrAmount } from "@/components/inr-amount";
import { dateLabel, dateTimeLabel, inrCompact } from "@/lib/format";
import { RUN_STATUS_LABELS } from "@/lib/workflow";
import type { ImportSummary } from "@/lib/import";
import type { ClassificationMetrics, Reason } from "@/lib/classify";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CLASS_TABS = [
  { key: "ALL", label: "All" },
  { key: "NON_DEPLOYABLE", label: "Non-Deployable" },
  { key: "NRG", label: "NRG" },
  { key: "NRG_REVIEW", label: "NRG Review" },
  { key: "OLD_FLEET", label: "Old Fleet" },
  { key: "HEALTHY", label: "Healthy" },
] as const;

const SEVERITY_RANK: Record<string, number> = { critical: 0, warning: 1, info: 2, pass: 3 };

function SeverityDot({ severity }: { severity: string }) {
  const color =
    severity === "critical"
      ? "var(--critical)"
      : severity === "warning"
        ? "var(--warning)"
        : severity === "pass"
          ? "var(--pass)"
          : "var(--info)";
  return (
    <span
      aria-hidden
      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

export default async function RunDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const runId = Number(id);
  if (!Number.isFinite(runId)) notFound();

  const user = await requireUser();
  const detail = await getRunDetail(runId);
  if (!detail) notFound();

  const { run, upload, rows, approvals, audit, policy } = detail;
  const summary = (run.summary ?? {}) as ImportSummary;

  const raw = sp.class;
  const requested = (Array.isArray(raw) ? raw[0] : raw) ?? "ALL";
  const classFilter = CLASS_TABS.some((tab) => tab.key === requested) ? requested : "ALL";

  const counts: Record<string, number> = { ALL: rows.length };
  for (const { result } of rows) {
    const key = result?.primaryClass ?? "HEALTHY";
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const filtered =
    classFilter === "ALL"
      ? rows
      : rows.filter(({ result }) => (result?.primaryClass ?? "HEALTHY") === classFilter);

  const lastApproval = approvals.length > 0 ? approvals[approvals.length - 1] : null;

  return (
    <>
      <Link
        href="/runs"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-brand"
      >
        <ArrowLeft size={14} /> Evaluation runs
      </Link>

      <PageHeader
        eyebrow={`Evaluation run #${run.id}`}
        title={`Fleet classification · ${dateLabel(run.evaluationDate)}`}
        description={`${summary.total ?? rows.length} assets classified with the policy snapshot stored on this run. Imported ${
          upload ? dateTimeLabel(upload.uploadedAt) : dateTimeLabel(run.createdAt)
        }${upload ? ` from ${upload.filename}` : ""}.`}
        actions={
          <>
            <Link href="/assets" className="btn btn-secondary">
              <Truck size={14} /> Fleet register
            </Link>
            <a href="/api/export/assets" className="btn btn-secondary">
              <Download size={14} /> Export CSV
            </a>
          </>
        }
      />

      <div className="card mb-4 flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={run.status} />
          <SignOffStepper status={run.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {run.status === "RETURNED" && (
            <span className="flex items-center gap-1.5 font-medium text-nd-ink">
              <AlertTriangle size={12} /> Returned for rework — see the latest comment in the trail
            </span>
          )}
          {run.status === "APPROVED" && (
            <span className="flex items-center gap-1.5 font-medium text-healthy-ink">
              <ShieldCheck size={12} /> Approved — this run sets the current fleet position
            </span>
          )}
          <span className="flex items-center gap-1.5 text-faint">
            <Lock size={11} /> Immutable record
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Assets evaluated"
          value={summary.total ?? rows.length}
          sub={`${inrCompact(summary.replacementCapexTotal ?? null)} replacement capex`}
          icon={<Truck size={15} />}
          tone="brand"
        />
        <KpiCard
          label="Old Fleet"
          value={summary.oldFleet ?? counts.OLD_FLEET ?? 0}
          sub={inrCompact(summary.capexOldFleet ?? null)}
          note="Flag count"
          icon={<Clock3 size={15} />}
          tone="old"
        />
        <KpiCard
          label="Non-Deployable"
          value={summary.nonDeployable ?? 0}
          sub={inrCompact(summary.capexNonDeployable ?? null)}
          note="Flag count"
          icon={<AlertTriangle size={15} />}
          tone="nd"
        />
        <KpiCard
          label="NRG confirmed"
          value={summary.nrg ?? 0}
          sub={`${summary.potentialNrg ?? 0} potential · ${inrCompact(summary.capexNrg ?? null)}`}
          note="Both conditions met"
          icon={<TrendingDown size={15} />}
          tone="nrg"
        />
        <KpiCard
          label="Healthy"
          value={summary.healthy ?? counts.HEALTHY ?? 0}
          sub={inrCompact(summary.capexHealthy ?? null)}
          note="Primary class"
          icon={<ShieldCheck size={15} />}
          tone="healthy"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.75fr_1fr]">
        <div className="space-y-4">
          <section className="card overflow-hidden" aria-labelledby="results-title">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <h2 id="results-title" className="panel-title">
                  Classification results
                </h2>
                <p className="panel-subtitle mt-0.5">
                  {rows.length} assets in this run · expand a row for its reason trail
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {CLASS_TABS.map((tab) => {
                  const active = classFilter === tab.key;
                  return (
                    <Link
                      key={tab.key}
                      href={
                        tab.key === "ALL"
                          ? `/runs/${run.id}`
                          : `/runs/${run.id}?class=${tab.key}`
                      }
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition ${
                        active
                          ? "border-[color-mix(in_srgb,var(--brand)_35%,transparent)] bg-brand-soft text-brand-ink"
                          : "border-line text-muted hover:border-line-strong hover:text-ink"
                      }`}
                    >
                      {tab.label}
                      <span className="tnum text-[9.5px] opacity-70">{counts[tab.key] ?? 0}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="table-wrap scroll-thin max-h-[640px] overflow-y-auto">
              <table className="data">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th>Asset</th>
                    <th>Model</th>
                    <th className="text-right">Age</th>
                    <th className="text-right">Util 3Y</th>
                    <th className="text-right">Yield 3Y</th>
                    <th>Flags</th>
                    <th>Primary class</th>
                    <th className="text-right">Capex</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-[12px] text-muted">
                        No assets in this classification for this run.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ asset, result }) => {
                    const metrics = (result?.metrics ?? null) as ClassificationMetrics | null;
                    const reasons = ((result?.reasons ?? []) as Reason[])
                      .slice()
                      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
                    const preview = reasons.slice(0, 3);
                    const criticals = reasons.filter((reason) => reason.severity === "critical");
                    return (
                      <tr key={asset.assetCode} className="align-top">
                        <td className="min-w-[220px]">
                          <Link
                            href={`/assets/${encodeURIComponent(asset.assetCode)}`}
                            className="font-mono text-[12px] font-semibold text-ink hover:text-brand"
                          >
                            {asset.assetCode}
                          </Link>
                          <div className="mt-0.5 max-w-[240px] truncate text-[10.5px] text-faint">
                            {criticals[0]?.title ?? asset.description ?? asset.model}
                          </div>
                          {preview.length > 0 && (
                            <details className="group mt-1.5">
                              <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[10px] font-semibold text-brand">
                                <span className="group-open:hidden">
                                  Why · {reasons.length} reason{reasons.length === 1 ? "" : "s"}
                                </span>
                                <span className="hidden group-open:inline">Hide reasons</span>
                              </summary>
                              <ul className="mt-1.5 space-y-1 border-l border-line pl-2.5">
                                {preview.map((reason, index) => (
                                  <li
                                    key={`${reason.code}-${index}`}
                                    className="flex items-start gap-1.5"
                                  >
                                    <SeverityDot severity={reason.severity} />
                                    <span className="text-[10px] leading-relaxed text-muted">
                                      {reason.title}
                                      {reason.observed ? ` · observed ${reason.observed}` : ""}
                                      {reason.threshold ? ` · threshold ${reason.threshold}` : ""}
                                    </span>
                                  </li>
                                ))}
                                {reasons.length > preview.length && (
                                  <li className="text-[10px] text-faint">
                                    +{reasons.length - preview.length} more in the asset detail
                                  </li>
                                )}
                              </ul>
                            </details>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-muted">{asset.model}</td>
                        <td className="mono whitespace-nowrap text-right">
                          {result?.ageYears ?? "—"}
                          {result?.ageThreshold != null && (
                            <span className="ml-1 text-[10px] text-faint">
                              / {result.ageThreshold}
                            </span>
                          )}
                        </td>
                        <td className="mono whitespace-nowrap text-right">
                          {metrics?.utilisationAvgPct != null
                            ? `${metrics.utilisationAvgPct.toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="mono whitespace-nowrap text-right">
                          {metrics?.monthlyYieldAvgPct != null
                            ? `${metrics.monthlyYieldAvgPct.toFixed(2)}%`
                            : "—"}
                        </td>
                        <td>
                          <FlagChips
                            oldFleet={result?.oldFleet ?? false}
                            nonDeployable={result?.nonDeployable ?? false}
                            nrg={result?.nrg ?? false}
                            nrgStatus={result?.nrgStatus ?? "insufficient"}
                          />
                        </td>
                        <td>
                          <ClassificationBadge value={result?.primaryClass ?? "HEALTHY"} />
                        </td>
                        <td className="whitespace-nowrap text-right">
                          <InrAmount
                            value={
                              asset.replacementCapex != null
                                ? Number(asset.replacementCapex)
                                : null
                            }
                            compact
                          />
                        </td>
                        <td className="w-8 text-faint">
                          <Link
                            href={`/assets/${encodeURIComponent(asset.assetCode)}`}
                            aria-label={`Open ${asset.assetCode}`}
                          >
                            <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card p-4" aria-labelledby="trail-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="trail-title" className="panel-title">
                Sign-off trail
              </h2>
              <span className="badge badge-slate">{approvals.length} action{approvals.length === 1 ? "" : "s"}</span>
            </div>
            <SignOffTimeline
              approvals={approvals.map((approval) => ({
                id: approval.id,
                action: approval.action,
                stage: approval.stage,
                actorName: approval.actorName,
                designation: approval.designation,
                actedAt: approval.actedAt,
                comment: approval.comment,
              }))}
              emptyText="No sign-off recorded yet. The run was created by an import and is waiting for the preparer."
            />
          </section>

          <section className="card overflow-hidden" aria-labelledby="audit-title">
            <div className="border-b border-line px-4 py-3">
              <h2 id="audit-title" className="panel-title">
                Audit log
              </h2>
              <p className="panel-subtitle mt-0.5">
                Import and sign-off events recorded against this run.
              </p>
            </div>
            {audit.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-muted">
                No audit entries linked to this import.
              </p>
            ) : (
              <div className="table-wrap scroll-thin">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
                            <FileText size={12} className="text-faint" />
                            {entry.action.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </td>
                        <td className="text-muted">{entry.actorName ?? "system"}</td>
                        <td className="whitespace-nowrap text-[11px] text-faint">
                          {dateTimeLabel(entry.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <SignOffPanel
            runId={run.id}
            status={run.status}
            role={user.role}
            userId={user.id}
            lastActor={
              lastApproval
                ? { actorId: lastApproval.actorId, actorName: lastApproval.actorName }
                : null
            }
          />

          <section className="card p-4" aria-labelledby="details-title">
            <h2 id="details-title" className="panel-title">
              Run details
            </h2>
            <dl className="mt-3 space-y-2 text-[11.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Run</dt>
                <dd className="font-medium text-ink">#{run.id}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Evaluation date</dt>
                <dd className="font-medium text-ink">{dateLabel(run.evaluationDate)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Status</dt>
                <dd className="font-medium text-ink">
                  {RUN_STATUS_LABELS[run.status] ?? run.status}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Source file</dt>
                <dd className="max-w-[190px] truncate font-medium text-ink">
                  {upload?.filename ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Imported</dt>
                <dd className="font-medium text-ink">
                  {upload ? dateTimeLabel(upload.uploadedAt) : dateTimeLabel(run.createdAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Data warnings</dt>
                <dd className="font-medium text-ink">
                  {(upload?.summary as { warnings?: number } | null)?.warnings ?? 0}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card p-4" aria-labelledby="policy-title">
            <h2 id="policy-title" className="panel-title">
              Policy snapshot
            </h2>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-faint">
              Stored with this run so historic results remain reproducible.
            </p>
            <dl className="mt-3 space-y-2 text-[11.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Old Fleet age</dt>
                <dd className="font-medium text-ink">&gt; {policy.oldFleetYears} yrs</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">NRG utilisation</dt>
                <dd className="font-medium text-ink">&lt; {policy.nrgUtilPct}%</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">NRG monthly yield</dt>
                <dd className="font-medium text-ink">&lt; {policy.nrgYieldPct}%</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Consecutive years</dt>
                <dd className="font-medium text-ink">{policy.nrgYears}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Repair trigger</dt>
                <dd className="font-medium text-ink">&gt; {policy.repairPct}% of capex</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Certificate grace</dt>
                <dd className="font-medium text-ink">{policy.certGraceDays} days</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Obsolescence scope</dt>
                <dd className="font-medium text-ink">
                  {policy.obsoleteScope === "all" ? "All equipment" : "Old Fleet only"}
                </dd>
              </div>
            </dl>
            <Link
              href="/settings"
              className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand"
            >
              Policy settings <ArrowRight size={12} />
            </Link>
          </section>

          {(summary.insufficientNrg > 0 || summary.potentialNrg > 0) && (
            <section className="card p-4" aria-labelledby="coverage-title">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-info" />
                <h2 id="coverage-title" className="panel-title">
                  Data coverage
                </h2>
              </div>
              <div className="mt-2.5 space-y-1.5 text-[11.5px] text-muted">
                <div className="flex items-center justify-between gap-2">
                  <span>NRG not testable</span>
                  <strong className="text-ink">{summary.insufficientNrg ?? 0}</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Retention pending</span>
                  <strong className="text-ink">{summary.potentialNrg ?? 0}</strong>
                </div>
                <p className="pt-1 text-[10.5px] leading-relaxed text-faint">
                  These assets lack three consecutive years of performance data or a retention
                  assessment. Add the missing rows and re-import to conclude their NRG test.
                </p>
              </div>
            </section>
          )}

          {upload && Array.isArray(upload.errors) && (upload.errors as unknown[]).length > 0 && (
            <section className="card p-4" aria-labelledby="errors-title">
              <div className="flex items-center gap-2 text-nd-ink">
                <AlertTriangle size={14} />
                <h2 id="errors-title" className="panel-title">
                  Import errors recorded
                </h2>
              </div>
              <ul className="mt-2 space-y-1 text-[10.5px] leading-relaxed text-muted">
                {(upload.errors as { message?: string }[]).slice(0, 8).map((error, index) => (
                  <li key={index}>· {error.message ?? "Unknown error"}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-healthy" />
              <div className="panel-title">Immutability</div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              A run cannot be edited or deleted. Its policy snapshot and reason trail are fixed at
              commit, so a later policy change never rewrites history. To correct data, import the
              workbook again — that creates a new run with its own sign-off chain.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
