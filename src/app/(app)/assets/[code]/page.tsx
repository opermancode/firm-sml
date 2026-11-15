import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Clock3,
  FileText,
  Gauge,
  Info,
  ShieldCheck,
  TrendingDown,
  Wrench,
} from "lucide-react";
import { getAssetDetail } from "@/lib/api";
import {
  CERTIFICATES,
  addDays,
  diffDays,
  toDateOnly,
  type ClassificationMetrics,
  type Reason,
} from "@/lib/classify";
import { ClassificationBadge, NrgStatusBadge } from "@/components/classification-badge";
import { FlagChips } from "@/components/flag-chip";
import { StatusBadge } from "@/components/status-badge";
import { ReasonItem } from "@/components/reason-item";
import { CertificateRow } from "@/components/certificate-row";
import { SignOffTimeline } from "@/components/sign-off-timeline";
import { PerformanceChart, type PerformancePoint } from "@/components/charts/performance-chart";
import { InrAmount } from "@/components/inr-amount";
import { dateLabel, inr, inrCompact, num, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

const toNum = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const SEVERITY_RANK: Record<string, number> = { critical: 0, warning: 1, info: 2, pass: 3 };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-faint">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] font-medium text-ink">{value}</dd>
    </div>
  );
}

function Outcome({ label, value }: { label: string; value: boolean | null }) {
  return (
    <span
      className={`badge ${
        value == null ? "badge-slate" : value ? "badge-nrg" : "badge-healthy"
      }`}
    >
      {label}: {value == null ? "not testable" : value ? "met" : "not met"}
    </span>
  );
}

export default async function AssetDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const detail = await getAssetDetail(decodeURIComponent(code));
  if (!detail) notFound();

  const { asset, row, result, policy, performance, retention } = detail;
  const metrics = (result?.metrics ?? null) as ClassificationMetrics | null;
  const reasons = (result?.reasons ?? []) as Reason[];
  const evalDate = toDateOnly(detail.runEvaluationDate ?? new Date().toISOString()) ?? new Date();

  const grouped = {
    OLD_FLEET: reasons
      .filter((reason) => reason.area === "OLD_FLEET")
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]),
    NON_DEPLOYABLE: reasons
      .filter((reason) => reason.area === "NON_DEPLOYABLE")
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]),
    NRG: reasons
      .filter((reason) => reason.area === "NRG")
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]),
  };

  const latestRetention = retention[0] ?? null;
  const repairRatio =
    toNum(asset.repairQuote) != null && toNum(asset.replacementCapex)
      ? ((toNum(asset.repairQuote) ?? 0) / (toNum(asset.replacementCapex) ?? 1)) * 100
      : null;

  const certRows = CERTIFICATES.map((cert) => {
    const expiryDate = toDateOnly(asset[cert.field] as string | null);
    const graceDate = expiryDate ? addDays(expiryDate, policy.certGraceDays) : null;
    const lapsed = graceDate != null && evalDate.getTime() > graceDate.getTime();
    const days = expiryDate ? diffDays(evalDate, expiryDate) : null;
    return {
      key: cert.key,
      label: cert.label,
      expiry: expiryDate ? expiryDate.toISOString().slice(0, 10) : null,
      graceEnd: graceDate ? graceDate.toISOString().slice(0, 10) : null,
      lapsed,
      days,
    };
  });

  const perfPoints: PerformancePoint[] = performance.map((perf) => {
    const available = toNum(perf.availableDays);
    const deployed = toNum(perf.deployedDays);
    const revenue = toNum(perf.rentalRevenue);
    const capital = toNum(perf.capitalEmployed);
    const utilisation =
      available && available > 0 && deployed != null ? (deployed / available) * 100 : null;
    const yieldPct =
      capital && capital > 0 && revenue != null ? (revenue / capital / 12) * 100 : null;
    const fails =
      utilisation != null && yieldPct != null
        ? utilisation < policy.nrgUtilPct && yieldPct < policy.nrgYieldPct
        : null;
    return { fy: perf.fy, utilisation, yieldPct, fails };
  });

  const rent = latestRetention?.rentabilityCommittable ?? null;
  const npv = toNum(latestRetention?.npv5yr);
  const sale = toNum(latestRetention?.salePrice);
  const capReturn = toNum(latestRetention?.capitalReleaseReturnPct);
  const craneReturn = toNum(latestRetention?.craneReturnPct);

  const condition21 =
    metrics?.condition21 ?? (rent != null && npv != null && sale != null ? rent === false && npv < sale : null);
  const condition22 =
    metrics?.condition22 ?? (capReturn != null && craneReturn != null ? capReturn > craneReturn : null);
  const condition1 = metrics?.condition1 ?? null;
  const condition2 =
    metrics?.condition2 ?? (condition21 != null && condition22 != null ? condition21 && condition22 : null);

  const outOfScope = policy.obsoleteScope === "old_fleet_only" && !row.oldFleet;
  const triggers = [
    {
      label: "OEM technical support",
      value: asset.oemSupport ?? null,
      fails: String(asset.oemSupport ?? "").toLowerCase() === "discontinued",
      threshold: "Discontinued",
    },
    {
      label: "Critical spares availability",
      value: asset.sparesAvailability ?? null,
      fails: String(asset.sparesAvailability ?? "").toLowerCase() === "unavailable",
      threshold: "Unavailable",
    },
    {
      label: "Safety / regulatory / emission compliance",
      value: asset.complianceStatus ?? null,
      fails: ["non_compliant", "non-compliant"].includes(
        String(asset.complianceStatus ?? "").toLowerCase(),
      ),
      threshold: "Non-compliant",
    },
    {
      label: "Repair cost vs replacement capex",
      value: repairRatio != null ? `${repairRatio.toFixed(1)}%` : null,
      fails: repairRatio != null && repairRatio > policy.repairPct,
      threshold: `> ${policy.repairPct}%`,
    },
  ];

  const ageRatio =
    row.ageThreshold != null && row.ageThreshold > 0
      ? Math.min(100, Math.round((row.ageYears / row.ageThreshold) * 100))
      : null;

  const matrix = [
    { key: "insufficient", c1: "Not testable", c2: "—", status: "Insufficient data", cls: "Old Fleet / Healthy" },
    { key: "not-met", c1: "Not met", c2: "—", status: "Not NRG", cls: "Old Fleet / Healthy" },
    { key: "potential", c1: "Met", c2: "Not testable", status: "Potential NRG", cls: "NRG Review" },
    { key: "nrg", c1: "Met", c2: "Met", status: "NRG confirmed", cls: "NRG" },
    { key: "not-met-2", c1: "Met", c2: "Not met", status: "Not NRG", cls: "Old Fleet / Healthy" },
  ];
  const activeMatrixKey =
    row.nrgStatus === "nrg"
      ? "nrg"
      : row.nrgStatus === "potential"
        ? "potential"
        : row.nrgStatus === "insufficient"
          ? "insufficient"
          : condition1 === false
            ? "not-met"
            : "not-met-2";

  return (
    <>
      <Link
        href="/assets"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-brand"
      >
        <ArrowLeft size={14} /> Fleet assets
      </Link>

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[24px] font-semibold tracking-[-0.02em] text-ink">
              {asset.assetCode}
            </h1>
            <ClassificationBadge value={row.primaryClass} />
            {detail.runStatus && <StatusBadge status={detail.runStatus} />}
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {asset.description ?? `${asset.model} crane`} · {asset.model}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="badge badge-slate">{asset.category ?? "Category not reported"}</span>
            {asset.capacityMt && (
              <span className="badge badge-slate">{num(toNum(asset.capacityMt))} MT</span>
            )}
            <span className="badge badge-slate">
              {asset.region ?? "—"}
              {asset.location ? ` · ${asset.location}` : ""}
            </span>
            {asset.currentStatus && <span className="badge badge-info">{asset.currentStatus}</span>}
            <FlagChips
              oldFleet={row.oldFleet}
              nonDeployable={row.nonDeployable}
              nrg={row.nrg}
              nrgStatus={row.nrgStatus}
            />
          </div>
        </div>
        {detail.runId && (
          <Link href={`/runs/${detail.runId}`} className="btn btn-secondary shrink-0">
            <FileText size={14} /> Source run #{detail.runId}
            <ArrowRight size={13} />
          </Link>
        )}
      </div>

      {!result && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-warning-soft px-4 py-3 text-[12.5px] text-warning-ink">
          <Info size={15} className="mt-0.5 shrink-0" />
          This asset is not part of the latest evaluation run. Import fleet data to classify it.
        </div>
      )}

      <section className="card mb-4 p-4" aria-labelledby="identity-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="identity-title" className="panel-title">
            Identity
          </h2>
          <span className="text-[10.5px] text-faint">
            Source run evaluated {dateLabel(detail.runEvaluationDate ?? new Date())}
          </span>
        </div>
        <dl className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Field label="Model" value={asset.model} />
          <Field label="Category" value={asset.category ?? "—"} />
          <Field label="Capacity" value={asset.capacityMt ? `${num(toNum(asset.capacityMt))} MT` : "—"} />
          <Field label="Year of manufacture" value={asset.yom} />
          <Field label="Region / location" value={`${asset.region ?? "—"}${asset.location ? ` · ${asset.location}` : ""}`} />
          <Field label="Replacement capex" value={<InrAmount value={toNum(asset.replacementCapex)} compact />} />
          <Field label="Current status" value={asset.currentStatus ?? "—"} />
          <Field label="Model age threshold" value={row.ageThreshold != null ? `${row.ageThreshold} years` : "Not in master"} />
          <Field label="Repair estimate" value={<InrAmount value={toNum(asset.repairQuote)} compact />} />
          <Field label="Capitalisation" value={dateLabel(asset.capitalisationDate)} />
          <Field label="Gross block" value={<InrAmount value={toNum(asset.grossBlock)} compact />} />
          <Field label="Net book value" value={<InrAmount value={toNum(asset.netBookValue)} compact />} />
        </dl>

        <div className="mt-4 rounded-lg border border-line bg-panel-2 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
              <Gauge size={13} /> Age against model threshold
            </span>
            <span className="flex items-center gap-1.5">
              <span className="mono text-[12px] font-semibold text-ink">{row.ageYears} yrs</span>
              {row.ageThreshold != null && (
                <span className="text-[10.5px] text-faint">of {row.ageThreshold} yrs</span>
              )}
              {row.oldFleet ? (
                <span className="badge badge-old">Old Fleet</span>
              ) : (
                <span className="badge badge-healthy">Within threshold</span>
              )}
            </span>
          </div>
          <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-panel-3">
            {ageRatio != null && (
              <div
                className="h-full rounded-full"
                style={{
                  width: `${ageRatio}%`,
                  background: row.oldFleet ? "var(--old)" : "var(--brand)",
                }}
              />
            )}
          </div>
          <div className="mt-1 flex justify-between text-[9.5px] text-faint">
            <span>YOM {asset.yom}</span>
            <span>
              {row.ageThreshold != null
                ? `Threshold > ${policy.oldFleetYears} yrs · model ${row.ageThreshold} yrs`
                : `Policy > ${policy.oldFleetYears} yrs`}
            </span>
          </div>
        </div>
      </section>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className={`card p-4 ${row.oldFleet ? "border-old/30 bg-old-soft/40" : ""}`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-muted">
              <Clock3 size={13} /> Old Fleet
            </span>
            {row.oldFleet ? (
              <span className="badge badge-old">Exceeded</span>
            ) : (
              <span className="badge badge-healthy">Within</span>
            )}
          </div>
          <div className="mt-2 font-display text-[18px] font-semibold text-ink">
            {row.ageYears} years
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            Threshold &gt; {policy.oldFleetYears} years from YOM {asset.yom}
          </div>
        </div>

        <div className={`card p-4 ${row.nonDeployable ? "border-nd/30 bg-nd-soft/40" : ""}`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-muted">
              <Wrench size={13} /> Non-Deployable
            </span>
            {row.nonDeployable ? (
              <span className="badge badge-nd">Fails</span>
            ) : (
              <span className="badge badge-healthy">Serviceable</span>
            )}
          </div>
          <div className="mt-2 font-display text-[18px] font-semibold text-ink">
            {row.nonDeployable
              ? `${reasons.filter((r) => r.area === "NON_DEPLOYABLE" && r.severity === "critical").length} trigger(s)`
              : "No trigger"}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            Certificates, obsolescence and repair cost
          </div>
        </div>

        <div className={`card p-4 ${row.nrg ? "border-nrg/30 bg-nrg-soft/40" : ""}`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-muted">
              <TrendingDown size={13} /> NRG
            </span>
            <NrgStatusBadge status={row.nrgStatus} />
          </div>
          <div className="mt-2 font-display text-[18px] font-semibold text-ink">
            {row.utilisationAvgPct != null ? `${row.utilisationAvgPct.toFixed(1)}%` : "—"}
            <span className="mx-1.5 text-line-strong">/</span>
            {row.monthlyYieldAvgPct != null ? `${row.monthlyYieldAvgPct.toFixed(2)}%` : "—"}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            3-year average utilisation / monthly yield
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <div className="space-y-4">
          <section className="card overflow-hidden" aria-labelledby="reasons-title">
            <div className="border-b border-line px-5 py-4">
              <h2 id="reasons-title" className="panel-title">
                Why this classification
              </h2>
              <p className="panel-subtitle mt-0.5">
                Every test, observed value and policy threshold, as at{" "}
                {dateLabel(detail.runEvaluationDate ?? new Date())}. Nothing is a black box.
              </p>
            </div>
            <div className="divide-y divide-line">
              {[
                { key: "OLD_FLEET" as const, title: "Old Fleet — marketability", tone: "badge-old" },
                {
                  key: "NON_DEPLOYABLE" as const,
                  title: "Non-Deployable — serviceability",
                  tone: "badge-nd",
                },
                { key: "NRG" as const, title: "NRG — under-performance", tone: "badge-nrg" },
              ].map((section) => (
                <div key={section.key} className="px-5 py-4">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h3 className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-muted">
                      {section.title}
                    </h3>
                    <span className={`badge ${section.tone}`}>
                      {grouped[section.key].length} reason
                      {grouped[section.key].length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="divide-y divide-line">
                    {grouped[section.key].map((reason, index) => (
                      <ReasonItem
                        key={`${reason.code}-${index}`}
                        severity={reason.severity}
                        title={reason.title}
                        detail={reason.detail}
                        observed={reason.observed}
                        threshold={reason.threshold}
                      />
                    ))}
                    {grouped[section.key].length === 0 && (
                      <li className="py-3 text-[12px] text-faint">No assessment recorded.</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-4" aria-labelledby="certs-title">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="certs-title" className="panel-title">
                  Statutory certificates
                </h2>
                <p className="panel-subtitle mt-0.5">
                  A lapsed certificate beyond the {policy.certGraceDays}-day grace period makes the
                  crane Non-Deployable.
                </p>
              </div>
              <span className="badge badge-slate">
                {certRows.filter((cert) => cert.expiry).length} / 4 reported
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {certRows.map((cert) => (
                <CertificateRow key={cert.key} certificate={cert} />
              ))}
            </div>
          </section>

          <section className="card p-4" aria-labelledby="obsolescence-title">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="obsolescence-title" className="panel-title">
                  Obsolescence triggers
                </h2>
                <p className="panel-subtitle mt-0.5">
                  Scope: {policy.obsoleteScope === "all" ? "all equipment" : "Old Fleet only"}.
                  Missing inputs are warnings, never failures.
                </p>
              </div>
              {outOfScope && <span className="badge badge-amber">Out of scope</span>}
            </div>

            <ul className="mt-3 space-y-2">
              {triggers.map((trigger) => {
                const missing = trigger.value == null || trigger.value === "";
                const status = trigger.fails
                  ? outOfScope
                    ? { className: "badge-amber", label: "Out of scope" }
                    : { className: "badge-nd", label: "Triggered" }
                  : missing
                    ? { className: "badge-amber", label: "Not reported" }
                    : { className: "badge-healthy", label: "Clear" };
                return (
                  <li
                    key={trigger.label}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-panel-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-medium text-ink">{trigger.label}</div>
                      <div className="mt-0.5 text-[10px] text-faint">
                        Observed: {trigger.value ? String(trigger.value).replace(/_/g, " ") : "not reported"}{" "}
                        · Threshold: {trigger.threshold}
                      </div>
                    </div>
                    <span className={`badge ${status.className}`}>{status.label}</span>
                  </li>
                );
              })}
            </ul>

            {outOfScope && (
              <p className="mt-2 rounded-lg border border-line bg-warning-soft px-3 py-2 text-[10.5px] leading-relaxed text-warning-ink">
                This crane is not Old Fleet. Under the current policy the obsolescence triggers are
                out of scope, so a fired trigger is recorded as a warning rather than a
                Non-Deployable failure.
              </p>
            )}
          </section>

          <section className="card overflow-hidden" aria-labelledby="performance-title">
            <div className="border-b border-line px-5 py-4">
              <h2 id="performance-title" className="panel-title">
                Performance history
              </h2>
              <p className="panel-subtitle mt-0.5">
                Utilisation = deployed ÷ available days · Monthly yield = (annual revenue ÷ capital
                employed) ÷ 12. Dashed lines are the policy thresholds.
              </p>
            </div>

            {perfPoints.length > 0 ? (
              <>
                <div className="px-4 pt-4">
                  <PerformanceChart
                    data={perfPoints}
                    utilThreshold={policy.nrgUtilPct}
                    yieldThreshold={policy.nrgYieldPct}
                  />
                </div>
                <div className="table-wrap scroll-thin mt-2">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Financial year</th>
                        <th className="text-right">Available</th>
                        <th className="text-right">Deployed</th>
                        <th className="text-right">Utilisation</th>
                        <th className="text-right">Rental revenue</th>
                        <th className="text-right">Capital employed</th>
                        <th className="text-right">Monthly yield</th>
                        <th>Test</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performance.map((perf) => {
                        const available = toNum(perf.availableDays);
                        const deployed = toNum(perf.deployedDays);
                        const revenue = toNum(perf.rentalRevenue);
                        const capital = toNum(perf.capitalEmployed);
                        const util =
                          available && available > 0 && deployed != null
                            ? (deployed / available) * 100
                            : null;
                        const yieldPct =
                          capital && capital > 0 && revenue != null
                            ? (revenue / capital / 12) * 100
                            : null;
                        const fails =
                          util != null && yieldPct != null
                            ? util < policy.nrgUtilPct && yieldPct < policy.nrgYieldPct
                            : null;
                        return (
                          <tr key={perf.id}>
                            <td className="font-medium text-ink">{perf.fy}</td>
                            <td className="mono text-right">{available ?? "—"}</td>
                            <td className="mono text-right">{deployed ?? "—"}</td>
                            <td className="mono text-right">
                              {util != null ? `${util.toFixed(1)}%` : "—"}
                            </td>
                            <td className="mono text-right">{inr(revenue)}</td>
                            <td className="mono text-right">{inr(capital)}</td>
                            <td className="mono text-right">
                              {yieldPct != null ? `${yieldPct.toFixed(2)}%` : "—"}
                            </td>
                            <td>
                              {fails == null ? (
                                <span className="badge badge-slate">Not testable</span>
                              ) : fails ? (
                                <span className="badge badge-nd">Below both</span>
                              ) : (
                                <span className="badge badge-healthy">Pass</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="px-5 py-8 text-center text-[12px] text-muted">
                No performance rows recorded. NRG Condition 1 cannot be tested.
              </p>
            )}
          </section>

          <section className="card p-4" aria-labelledby="retention-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="retention-title" className="panel-title">
                  Retention economics · Condition 2
                </h2>
                <p className="panel-subtitle mt-0.5">
                  Both sub-tests must be testable and met for NRG Condition 2 to hold.
                </p>
              </div>
              <Outcome label="Condition 2" value={condition2} />
            </div>

            {latestRetention ? (
              <>
                <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Field
                    label="5-year rentability"
                    value={
                      rent == null ? "—" : rent ? (
                        <span className="badge badge-healthy">Committable</span>
                      ) : (
                        <span className="badge badge-nd">Not committable</span>
                      )
                    }
                  />
                  <Field label="NPV of 5-year cash flows" value={<InrAmount value={npv} />} />
                  <Field label="Achievable sale price" value={<InrAmount value={sale} />} />
                  <Field
                    label="Return on capital released"
                    value={pct(capReturn)}
                  />
                  <Field label="Crane 5-year return" value={pct(craneReturn)} />
                  <Field label="Recommendation" value={latestRetention.recommendation ?? "—"} />
                </dl>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-line bg-panel-2 px-3 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-faint">
                      Condition 2.1
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[10.5px] text-muted">Rentability not underwritten and NPV below sale price</span>
                      <Outcome label="2.1" value={condition21} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-line bg-panel-2 px-3 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-faint">
                      Condition 2.2
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[10.5px] text-muted">Capital-release return beats the crane 5-year return</span>
                      <Outcome label="2.2" value={condition22} />
                    </div>
                  </div>
                </div>

                {latestRetention.justification && (
                  <p className="mt-3 rounded-lg border border-line bg-panel-2 px-3 py-2.5 text-[11.5px] leading-relaxed text-muted">
                    {latestRetention.justification}
                  </p>
                )}
                <div className="mt-2 text-[10px] text-faint">
                  Assessment dated {dateLabel(latestRetention.evaluationDate)}
                </div>
              </>
            ) : (
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                No retention assessment recorded. Condition 2 cannot be concluded, so a Condition 1
                failure shows as <strong className="text-ink">Potential NRG</strong> and the asset
                is placed in NRG Review.
              </p>
            )}
          </section>

          <section className="card p-4" aria-labelledby="matrix-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="matrix-title" className="panel-title">
                  NRG status explainer
                </h2>
                <p className="panel-subtitle mt-0.5">
                  How Condition 1 and Condition 2 combine. The current row is highlighted.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Outcome label="Condition 1" value={condition1} />
                <NrgStatusBadge status={row.nrgStatus} />
              </div>
            </div>
            <div className="table-wrap scroll-thin mt-3">
              <table className="data">
                <thead>
                  <tr>
                    <th>Condition 1</th>
                    <th>Condition 2</th>
                    <th>NRG status</th>
                    <th>Primary class</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((entry) => {
                    const active = entry.key === activeMatrixKey;
                    return (
                      <tr key={entry.key} className={active ? "bg-brand-soft" : ""}>
                        <td className={active ? "font-semibold text-brand-ink" : "text-muted"}>
                          {entry.c1}
                        </td>
                        <td className={active ? "font-semibold text-brand-ink" : "text-muted"}>
                          {entry.c2}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              entry.status === "NRG confirmed"
                                ? "badge-nrg"
                                : entry.status === "Potential NRG"
                                  ? "badge-amber"
                                  : entry.status === "Insufficient data"
                                    ? "badge-slate"
                                    : "badge-healthy"
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className={active ? "font-semibold text-brand-ink" : "text-muted"}>
                          {entry.cls}
                          {active && <span className="ml-2 text-[9.5px] text-brand">← current</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-4" aria-labelledby="signoff-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="signoff-title" className="panel-title">
                Sign-off
              </h2>
              {detail.runStatus && <StatusBadge status={detail.runStatus} />}
            </div>
            <SignOffTimeline
              approvals={detail.approvals.map((approval) => ({
                id: approval.id,
                action: approval.action,
                stage: approval.stage,
                actorName: approval.actorName,
                designation: approval.designation,
                actedAt: approval.actedAt,
                comment: approval.comment,
              }))}
              emptyText="No sign-off recorded for this evaluation run yet."
            />
            {detail.runId && (
              <Link
                href={`/runs/${detail.runId}`}
                className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand"
              >
                Open run for sign-off <ArrowRight size={12} />
              </Link>
            )}
          </section>

          <section className="card p-4" aria-labelledby="policy-applied-title">
            <h2 id="policy-applied-title" className="panel-title">
              Policy applied
            </h2>
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
                <dt className="text-muted">Repair cost trigger</dt>
                <dd className="font-medium text-ink">&gt; {policy.repairPct}% of capex</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Certificate grace</dt>
                <dd className="font-medium text-ink">{policy.certGraceDays} days</dd>
              </div>
            </dl>
            <Link
              href="/settings"
              className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand"
            >
              Review policy settings <ArrowRight size={12} />
            </Link>
          </section>

          <section className="card p-4" aria-labelledby="completeness-title">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-faint" />
              <h2 id="completeness-title" className="panel-title">
                Data completeness
              </h2>
            </div>
            <div className="mt-2.5 space-y-1.5 text-[11.5px] text-muted">
              <div>
                Performance years:{" "}
                <strong className="text-ink">{performance.length}</strong> (policy requires{" "}
                {policy.nrgYears})
              </div>
              <div>
                Certificates reported:{" "}
                <strong className="text-ink">
                  {certRows.filter((cert) => cert.expiry).length} / 4
                </strong>
              </div>
              <div>
                Retention assessment:{" "}
                <strong className="text-ink">{latestRetention ? "recorded" : "missing"}</strong>
              </div>
              <div>
                Replacement capex:{" "}
                <strong className="text-ink">
                  {toNum(asset.replacementCapex) != null ? inrCompact(toNum(asset.replacementCapex)) : "missing"}
                </strong>
              </div>
              {asset.notes && <div className="pt-1 text-[10.5px] italic text-faint">{asset.notes}</div>}
            </div>
          </section>

          <section className="card p-4">
            <div className="flex items-center gap-2">
              <BadgeCheck size={14} className="text-faint" />
              <div className="panel-title">Governance note</div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Classifications are reproducible: the run stores the policy snapshot and every reason.
              Changing policy thresholds affects new runs only, never this result.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
