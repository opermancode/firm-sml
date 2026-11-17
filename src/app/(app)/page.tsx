import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  CircleAlert,
  ClipboardCheck,
  LockKeyhole,
  Truck,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getApprovalQueue, getDashboard } from "@/lib/firm/api";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { StatusChip } from "@/components/status-chip";
import { StatusBars } from "@/components/charts/status-bars";
import { EmptyState } from "@/components/empty-state";
import { STATUSES, STATUS_MAP, ROLE_MAP, type Role } from "@/lib/firm/workflow";
import { dateLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const [data, queue] = await Promise.all([getDashboard(), getApprovalQueue(user.role)]);
  const role = ROLE_MAP[user.role as Role];

  return (
    <>
      <PageHeader
        eyebrow="FIRM cycle"
        title="Cycle dashboard"
        description={`One place to see every crane in the exit cycle, what is waiting on approval, and what SAP has locked. You are signed in as ${role?.name ?? user.role}.`}
        help="The dashboard shows the current cycle, counts by status, what is waiting on you, conflicts and every active SO end date."
        actions={
          <>
            <Link href="/cranes" className="btn btn-secondary">
              <Truck size={14} /> Crane register
            </Link>
            <Link href="/approvals" className="btn btn-primary">
              <ClipboardCheck size={14} /> My approvals
              {queue.length > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white/25 px-1 text-[9.5px] font-bold">
                  {queue.length}
                </span>
              )}
            </Link>
          </>
        }
      />

      {data.cycle && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel px-4 py-3">
          <CalendarRange size={15} className="text-brand" />
          <span className="text-[12.5px] font-semibold text-ink">{data.cycle.name}</span>
          <span className="badge badge-healthy">Open</span>
          <span className="text-[11px] text-muted">
            Evaluation date {dateLabel(data.cycle.evaluationDate)} · opened by {data.cycle.openedBy}
          </span>
          <Link href={`/cycles/${data.cycle.id}`} className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">
            View cycle <ArrowRight size={12} />
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Cranes in cycle" value={data.total} sub="All statuses" icon={<Truck size={16} />} tone="brand" href="/cranes" />
        <KpiCard label="Active" value={data.byStatus.filter((s) => STATUS_MAP[s.code].type === "Active").reduce((n, s) => n + s.count, 0)} sub="Moving through a layer" icon={<ArrowRight size={16} />} tone="neutral" href="/cranes?type=Active" />
        <KpiCard label="Awaiting approval" value={data.approvals} sub="Named approver assigned" icon={<ClipboardCheck size={16} />} tone="nrg-review" href="/approvals" />
        <KpiCard label="Conflicts" value={data.conflicts} sub="S14 · decision in 3 days" icon={<CircleAlert size={16} />} tone="nd" href="/cranes?status=S14" />
        <KpiCard label="Locked in SAP" value={data.locked} sub="Cannot be claimed back" icon={<LockKeyhole size={16} />} tone="healthy" href="/cranes?type=Locked" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="card p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="panel-title">Crane status pipeline</h2>
              <p className="panel-subtitle">Every crane has exactly one of the 20 statuses.</p>
            </div>
            <Link href="/cranes" className="text-[11px] font-semibold text-brand hover:underline">Open register</Link>
          </div>
          <StatusBars
            data={data.byStatus.map((entry) => ({
              code: entry.code,
              name: STATUS_MAP[entry.code].name,
              count: entry.count,
              type: STATUS_MAP[entry.code].type,
            }))}
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {STATUSES.filter((status) => data.byStatus.some((entry) => entry.code === status.code)).map((status) => {
              const count = data.byStatus.find((entry) => entry.code === status.code)?.count ?? 0;
              return (
                <Link
                  key={status.code}
                  href={`/cranes?status=${status.code}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel-2 px-2.5 py-2 transition hover:border-brand hover:bg-brand-soft"
                >
                  <StatusChip status={status.code} />
                  <span className="text-[12px] font-bold tabular-nums text-ink">{count}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="card p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="panel-title">Needs attention</h2>
              <p className="panel-subtitle">Approvals, conflicts and stuck cranes.</p>
            </div>
            <Link href="/approvals" className="text-[11px] font-semibold text-brand hover:underline">All approvals</Link>
          </div>
          {data.reminders.length === 0 && queue.length === 0 ? (
            <EmptyState title="Nothing waiting" description="No crane is blocked or awaiting a decision." />
          ) : (
            <div className="space-y-2">
              {queue.slice(0, 4).map((item) => (
                <Link
                  key={`q-${item.crane.id}`}
                  href={`/approvals?crane=${item.crane.id}`}
                  className="flex items-start gap-2 rounded-lg border border-line bg-panel-2 px-2.5 py-2 transition hover:border-brand"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-nrg-review" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-ink">{item.crane.equipmentId} · {item.decision}</span>
                    <span className="block truncate text-[10.5px] text-muted">{item.note}</span>
                  </span>
                  <StatusChip status={item.crane.status} compact showCode={false} />
                </Link>
              ))}
              {data.reminders.slice(0, 4).map((item) => (
                <Link
                  key={`r-${item.crane.id}`}
                  href={`/cranes/${item.crane.id}`}
                  className="flex items-start gap-2 rounded-lg border border-line px-2.5 py-2 transition hover:border-brand"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-nd" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-ink">{item.crane.equipmentId} · {item.crane.description}</span>
                    <span className="block truncate text-[10.5px] text-muted">{item.reason}</span>
                  </span>
                  <span className="text-[10px] text-faint">{item.sinceDays}d</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="panel-title">Process at a glance</h2>
          <p className="panel-subtitle mt-1">Sales and Maintenance review the full fleet in parallel, then Finance deduplicates.</p>
          <ol className="mt-4 space-y-2.5">
            {[
              "FP&A uploads the fleet; age and Old Fleet flag are derived from YOM.",
              "Sales and Maintenance submit checks side by side (S01 → S02).",
              "Finance deduplicates: Non-Deployable wins, then Old Fleet over NRG.",
              "Old Fleet / NRG → international BU window; Non-Deployable → sale directly.",
              "Marketing catalogue, SCM sale or scrap; SAP SO or transfer locks the crane.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3 text-[12px] leading-relaxed text-muted">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand-ink">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>
        <section className="card p-4">
          <h2 className="panel-title">Execution allowed from</h2>
          <p className="panel-subtitle mt-1">A crane on rent stays in the cycle, but a new SO, deployment or handover waits for the current SO to end.</p>
          <div className="mt-4 space-y-2">
            {data.cranes.filter((crane) => crane.sap.soEnd).slice(0, 5).map((crane) => (
              <div key={crane.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <span className="text-[12px] font-semibold text-ink">{crane.equipmentId}</span>
                <span className="font-mono text-[10.5px] text-muted">{crane.sap.soNumber ?? "—"} · ends {crane.sap.soEnd}</span>
              </div>
            ))}
            {data.cranes.every((crane) => !crane.sap.soEnd) && (
              <EmptyState title="No active SO dates" description="Upload a fleet with SO End Date values to see the execution rule here." />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
