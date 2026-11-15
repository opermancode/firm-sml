import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CircleX,
  ClipboardList,
  Clock3,
  Database,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  TrendingDown,
  Truck,
  UploadCloud,
} from "lucide-react";
import { getDashboard } from "@/lib/api";
import { sanitizePolicy, type Policy } from "@/lib/policy";
import { dateLabel, inrCompact, share } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { ClassificationBadge } from "@/components/classification-badge";
import { StatusBadge } from "@/components/status-badge";
import { SignOffStepper } from "@/components/sign-off-stepper";
import { EmptyState } from "@/components/empty-state";
import { ClassificationDonut } from "@/components/charts/classification-donut";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboard();
  const policy = data.run
    ? sanitizePolicy((data.run.policy ?? {}) as Partial<Policy>)
    : sanitizePolicy({});

  const classCounts: Record<string, number> = {
    NON_DEPLOYABLE: 0,
    NRG: 0,
    NRG_REVIEW: 0,
    OLD_FLEET: 0,
    HEALTHY: 0,
  };
  let capexOld = 0;
  let capexNd = 0;
  let capexNrg = 0;
  let capexHealthy = 0;
  let capexTotal = 0;

  for (const row of data.rows) {
    classCounts[row.primaryClass] = (classCounts[row.primaryClass] ?? 0) + 1;
    capexTotal += row.replacementCapex ?? 0;
    if (row.oldFleet) capexOld += row.replacementCapex ?? 0;
    if (row.nonDeployable) capexNd += row.replacementCapex ?? 0;
    if (row.nrg) capexNrg += row.replacementCapex ?? 0;
    if (row.primaryClass === "HEALTHY") capexHealthy += row.replacementCapex ?? 0;
  }

  const flaggedCount = data.rows.filter((row) => row.primaryClass !== "HEALTHY").length;
  const maxRegion = Math.max(1, ...data.byRegion.map((region) => region.total));

  return (
    <>
      <PageHeader
        eyebrow="Latest evaluation"
        title="Fleet classification dashboard"
        description={
          data.run
            ? `Run #${data.run.id} evaluated on ${dateLabel(data.run.evaluationDate)} · ${data.fleetCount} assets · policy v1.0. Every figure reflects the latest evaluation run.`
            : "No evaluation run yet. Import the fleet workbook to classify the fleet for the first time."
        }
        actions={
          <>
            {data.run && (
              <Link href={`/runs/${data.run.id}`} className="btn btn-secondary">
                <ClipboardList size={14} /> Open run #{data.run.id}
              </Link>
            )}
            <Link href="/import" className="btn btn-primary">
              <UploadCloud size={14} /> Import data
            </Link>
          </>
        }
      />

      {data.pendingApprovals > 0 && (
        <Link
          href="/approvals"
          className="mb-5 flex flex-col gap-2 rounded-xl border border-[color-mix(in_srgb,var(--brand)_28%,transparent)] bg-brand-soft px-4 py-3 transition hover:border-brand sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <BadgeCheck size={16} className="mt-0.5 shrink-0 text-brand" />
            <div>
              <div className="text-[12.5px] font-semibold text-brand-ink">
                {data.pendingApprovals} evaluation run
                {data.pendingApprovals === 1 ? "" : "s"} awaiting sign-off
              </div>
              <div className="text-[11px] text-muted">
                Runs move through Prepared → Reviewed → Approved. Review the queue to keep the
                approved fleet current.
              </div>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[11.5px] font-semibold text-brand-ink">
            Open approvals <ArrowRight size={13} />
          </span>
        </Link>
      )}

      {data.fleetCount === 0 ? (
        <EmptyState
          icon={<Truck size={22} />}
          title="No fleet has been imported yet"
          description="Download the template, fill the Fleet Master sheet, then validate and commit the workbook. Classification runs automatically on commit."
          actions={
            <>
              <Link href="/import" className="btn btn-primary">
                <UploadCloud size={14} /> Import a workbook
              </Link>
              <a href="/api/template?kind=template" className="btn btn-secondary">
                <Download size={14} /> Download template
              </a>
              <a href="/api/template?kind=sample" className="btn btn-secondary">
                <Download size={14} /> Download sample fleet
              </a>
            </>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Fleet assets"
              value={data.fleetCount}
              sub={`Replacement capex ${inrCompact(capexTotal)}`}
              note={`${flaggedCount} flagged · ${data.fleetCount - flaggedCount} healthy`}
              icon={<Truck size={15} />}
              tone="brand"
              href="/assets"
            />
            <KpiCard
              label="Old Fleet"
              value={data.rows.filter((row) => row.oldFleet).length}
              sub={`Capex ${inrCompact(capexOld)}`}
              note="Flag count · age above model threshold"
              icon={<Clock3 size={15} />}
              tone="old"
              href="/assets?classification=OLD_FLEET"
            />
            <KpiCard
              label="Non-Deployable"
              value={data.rows.filter((row) => row.nonDeployable).length}
              sub={`Capex ${inrCompact(capexNd)}`}
              note="Flag count · serviceability failure"
              icon={<CircleX size={15} />}
              tone="nd"
              href="/assets?classification=NON_DEPLOYABLE"
            />
            <KpiCard
              label="NRG confirmed"
              value={data.rows.filter((row) => row.nrg).length}
              sub={`Capex ${inrCompact(capexNrg)}`}
              note="Flag count · both NRG conditions met"
              icon={<TrendingDown size={15} />}
              tone="nrg"
              href="/assets?classification=NRG"
            />
            <KpiCard
              label="Healthy"
              value={classCounts.HEALTHY ?? 0}
              sub={`Capex ${inrCompact(capexHealthy)}`}
              note="Primary class · no action required"
              icon={<ShieldCheck size={15} />}
              tone="healthy"
              href="/assets?classification=HEALTHY"
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
            <section className="card p-4" aria-labelledby="mix-title">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="mix-title" className="panel-title">
                    Classification mix
                  </h2>
                  <p className="panel-subtitle mt-0.5">
                    Primary class after precedence: Non-Deployable → NRG → NRG Review → Old Fleet →
                    Healthy.
                  </p>
                </div>
                <span className="badge badge-slate">{data.fleetCount} assets</span>
              </div>
              <div className="mt-4">
                <ClassificationDonut counts={classCounts} total={data.fleetCount} />
              </div>
            </section>

            <section className="card p-4" aria-labelledby="policy-title">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="policy-title" className="panel-title">
                    Policy tests
                  </h2>
                  <p className="panel-subtitle mt-0.5">
                    Thresholds applied to this run, and how many cranes each test flags.
                  </p>
                </div>
                <Link href="/settings" className="btn btn-ghost btn-sm">
                  Settings <ArrowRight size={12} />
                </Link>
              </div>

              <ul className="mt-3 divide-y divide-line">
                <li className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-ink">Old Fleet age</div>
                    <div className="text-[10.5px] text-faint">
                      Age above {policy.oldFleetYears} years from YOM
                    </div>
                  </div>
                  <span className="badge badge-old shrink-0">
                    {data.rows.filter((row) => row.oldFleet).length} cranes
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-ink">Serviceability</div>
                    <div className="text-[10.5px] text-faint">
                      Certificate lapsed beyond {policy.certGraceDays} days, or repair cost above{" "}
                      {policy.repairPct}% of capex
                    </div>
                  </div>
                  <span className="badge badge-nd shrink-0">
                    {data.rows.filter((row) => row.nonDeployable).length} cranes
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-ink">NRG Condition 1</div>
                    <div className="text-[10.5px] text-faint">
                      Utilisation below {policy.nrgUtilPct}% and monthly yield below{" "}
                      {policy.nrgYieldPct}% for {policy.nrgYears} consecutive years
                    </div>
                  </div>
                  <span className="badge badge-nrg shrink-0">
                    {data.rows.filter((row) => row.nrg).length} confirmed
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-ink">NRG Review</div>
                    <div className="text-[10.5px] text-faint">
                      Condition 1 met but retention economics not testable
                    </div>
                  </div>
                  <span className="badge badge-amber shrink-0">
                    {classCounts.NRG_REVIEW ?? 0} review
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-ink">Obsolescence scope</div>
                    <div className="text-[10.5px] text-faint">
                      OEM support, spares, compliance and repair triggers
                    </div>
                  </div>
                  <span className="badge badge-slate shrink-0">
                    {policy.obsoleteScope === "all" ? "All equipment" : "Old Fleet only"}
                  </span>
                </li>
              </ul>
            </section>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
            <section className="card overflow-hidden" aria-labelledby="priority-title">
              <div className="flex items-start justify-between gap-3 p-4 pb-3">
                <div>
                  <h2 id="priority-title" className="panel-title">
                    Priority actions
                  </h2>
                  <p className="panel-subtitle mt-0.5">
                    Most severe primary class first, then replacement capex.
                  </p>
                </div>
                <Link href="/assets?classification=FLAGGED&sort=risk" className="btn btn-ghost btn-sm">
                  All flagged <ArrowRight size={12} />
                </Link>
              </div>
              <div className="table-wrap scroll-thin">
                <table className="data">
                  <thead>
                    <tr>
                      <th scope="col">Asset</th>
                      <th scope="col">Primary class</th>
                      <th scope="col">Reasons</th>
                      <th scope="col" className="text-right">
                        Capex
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.priority.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <Link href={`/assets/${encodeURIComponent(row.code)}`} className="group block">
                            <span className="font-mono text-[12px] font-semibold text-ink group-hover:text-brand">
                              {row.code}
                            </span>
                            <span className="block max-w-[240px] truncate text-[10.5px] text-faint">
                              {row.description ?? row.model}
                            </span>
                          </Link>
                        </td>
                        <td>
                          <ClassificationBadge value={row.primaryClass} />
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            {row.criticalCount > 0 && (
                              <span className="badge badge-nd">{row.criticalCount} critical</span>
                            )}
                            {row.warningCount > 0 && (
                              <span className="badge badge-amber">{row.warningCount} warning</span>
                            )}
                            {row.criticalCount + row.warningCount === 0 && (
                              <span className="text-[10.5px] text-faint">—</span>
                            )}
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="mono text-[11.5px] text-ink">
                            {inrCompact(row.replacementCapex)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.priority.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-[12px] text-muted">
                          No flagged assets. The whole fleet is healthy under the current policy.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card p-4" aria-labelledby="coverage-title">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="coverage-title" className="panel-title">
                    Data coverage
                  </h2>
                  <p className="panel-subtitle mt-0.5">
                    Gaps that prevent a classification from being concluded.
                  </p>
                </div>
                <Database size={15} className="text-faint" />
              </div>

              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/assets?data=nrg-insufficient"
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel-2 px-3 py-2.5 transition hover:border-brand"
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                      <span>
                        <span className="block text-[11.5px] font-medium text-ink">
                          NRG not testable
                        </span>
                        <span className="block text-[10px] text-faint">
                          Missing performance years or capital employed
                        </span>
                      </span>
                    </span>
                    <span className="mono shrink-0 text-[14px] font-semibold text-ink">
                      {data.dataGaps.nrgInsufficient}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/assets?data=nrg-potential"
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel-2 px-3 py-2.5 transition hover:border-brand"
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      <TrendingDown size={14} className="mt-0.5 shrink-0 text-nrg" />
                      <span>
                        <span className="block text-[11.5px] font-medium text-ink">
                          Retention pending
                        </span>
                        <span className="block text-[10px] text-faint">
                          Potential NRG awaiting a retention assessment
                        </span>
                      </span>
                    </span>
                    <span className="mono shrink-0 text-[14px] font-semibold text-ink">
                      {data.dataGaps.nrgPotential}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/assets?data=missing-capex"
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel-2 px-3 py-2.5 transition hover:border-brand"
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      <FileSpreadsheet size={14} className="mt-0.5 shrink-0 text-faint" />
                      <span>
                        <span className="block text-[11.5px] font-medium text-ink">
                          Missing capex
                        </span>
                        <span className="block text-[10px] text-faint">
                          Replacement capex blank in the workbook
                        </span>
                      </span>
                    </span>
                    <span className="mono shrink-0 text-[14px] font-semibold text-ink">
                      {data.dataGaps.missingCapex}
                    </span>
                  </Link>
                </li>
              </ul>

              <div className="mt-3 rounded-lg border border-line bg-panel-2 px-3 py-2.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-faint">
                  Portfolio capex
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-[20px] font-semibold text-ink tnum">
                    {inrCompact(capexTotal)}
                  </span>
                  <span className="text-[10.5px] text-faint">replacement value</span>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
            <section className="card overflow-hidden" aria-labelledby="region-title">
              <div className="flex items-start justify-between gap-3 p-4 pb-3">
                <div>
                  <h2 id="region-title" className="panel-title">
                    Portfolio by region
                  </h2>
                  <p className="panel-subtitle mt-0.5">
                    Fleet size, Non-Deployable and NRG concentration by region.
                  </p>
                </div>
                <Link href="/assets" className="btn btn-ghost btn-sm">
                  Register <ArrowRight size={12} />
                </Link>
              </div>
              <div className="table-wrap scroll-thin">
                <table className="data">
                  <thead>
                    <tr>
                      <th scope="col">Region</th>
                      <th scope="col">Fleet</th>
                      <th scope="col">Non-Deployable</th>
                      <th scope="col">NRG</th>
                      <th scope="col" className="text-right">
                        Capex
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byRegion.map((region) => (
                      <tr key={region.region}>
                        <td>
                          <Link
                            href={`/assets?region=${encodeURIComponent(region.region)}`}
                            className="flex items-center gap-2 hover:text-brand"
                          >
                            <span className="font-medium text-ink">{region.region}</span>
                          </Link>
                          <div className="mt-1 flex h-1.5 w-[140px] overflow-hidden rounded-full bg-panel-3">
                            <span
                              className="h-full bg-brand"
                              style={{ width: `${share(region.total, maxRegion)}%` }}
                            />
                          </div>
                        </td>
                        <td className="mono">{region.total}</td>
                        <td>
                          {region.nonDeployable > 0 ? (
                            <span className="badge badge-nd">{region.nonDeployable}</span>
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                        <td>
                          {region.nrg > 0 ? (
                            <span className="badge badge-nrg">{region.nrg}</span>
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                        <td className="text-right mono text-[11.5px]">
                          {inrCompact(region.capex)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card overflow-hidden" aria-labelledby="runs-title">
              <div className="flex items-start justify-between gap-3 p-4 pb-3">
                <div>
                  <h2 id="runs-title" className="panel-title">
                    Recent imports
                  </h2>
                  <p className="panel-subtitle mt-0.5">
                    Latest evaluation runs and their sign-off state.
                  </p>
                </div>
                <Link href="/runs" className="btn btn-ghost btn-sm">
                  All runs <ArrowRight size={12} />
                </Link>
              </div>

              {data.recentRuns.length === 0 ? (
                <p className="px-4 pb-4 text-[12px] text-muted">No runs recorded yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.recentRuns.map((run) => (
                    <li key={run.id}>
                      <Link
                        href={`/runs/${run.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-panel-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-ink">
                              Run #{run.id}
                            </span>
                            <StatusBadge status={run.status} />
                          </div>
                          <div className="mt-0.5 truncate text-[10.5px] text-faint">
                            {dateLabel(run.evaluationDate)}
                            {run.filename ? ` · ${run.filename}` : ""}
                            {run.summary ? ` · ${run.summary.total} assets` : ""}
                          </div>
                        </div>
                        <SignOffStepper status={run.status} compact />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
                <span className="text-[10.5px] text-faint">
                  Approved runs set the evaluation date shown in the top bar.
                </span>
                <Link href="/approvals" className="text-[10.5px] font-semibold text-brand">
                  Approvals queue
                </Link>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
