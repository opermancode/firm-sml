import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Lock,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { getApprovalQueue, getRuns, type ApprovalQueueItem } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { SignOffStepper } from "@/components/sign-off-stepper";
import { InrAmount } from "@/components/inr-amount";
import { dateLabel, dateTimeLabel, inrCompact } from "@/lib/format";
import type { ImportSummary } from "@/lib/import";

export const dynamic = "force-dynamic";

function requiredRole(status: string): string | null {
  if (status === "PENDING" || status === "RETURNED") return "PREPARER";
  if (status === "PREPARED") return "REVIEWER";
  if (status === "REVIEWED") return "APPROVER";
  return null;
}

function canAct(status: string, role: string): boolean {
  const required = requiredRole(status);
  if (!required) return false;
  return role === "ADMIN" || role === required;
}

const STAGES = [
  { role: "PREPARER", label: "Prepared by", detail: "Confirms the imported data and classification" },
  { role: "REVIEWER", label: "Reviewed by", detail: "Validates the classification result" },
  { role: "APPROVER", label: "Approved by", detail: "Records final management sign-off" },
];

export default async function ApprovalsPage() {
  const user = await requireUser();
  const [queue, allRuns] = await Promise.all([getApprovalQueue(), getRuns(200)]);

  const actionable = queue.filter(
    (item) => canAct(item.run.status, user.role) && item.approvals.at(-1)?.actorId !== user.id,
  );
  const blockedBySegregation = queue.filter(
    (item) => canAct(item.run.status, user.role) && item.approvals.at(-1)?.actorId === user.id,
  );
  const others = queue.filter((item) => !canAct(item.run.status, user.role));
  const approvedAll = allRuns.filter((run) => run.status === "APPROVED");
  const approved = approvedAll.slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Approvals"
        description="The policy sign-off chain is Prepared by → Reviewed by → Approved by. Each action is recorded with the actor, designation, timestamp and comment, and no one may record two consecutive stages."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Awaiting your action"
          value={actionable.length}
          sub="Runs you can act on now"
          icon={<ClipboardCheck size={15} />}
          tone="brand"
        />
        <KpiCard
          label="Blocked by segregation"
          value={blockedBySegregation.length}
          sub="You recorded the previous stage"
          icon={<Lock size={15} />}
          tone="nrg-review"
        />
        <KpiCard
          label="In the chain"
          value={others.length}
          sub="Waiting on another role"
          icon={<Clock3 size={15} />}
          tone="neutral"
        />
        <KpiCard
          label="Approved evaluations"
          value={approvedAll.length}
          sub="Current fleet position"
          icon={<ShieldCheck size={15} />}
          tone="healthy"
        />
      </div>

      <div className="card mb-4 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-muted">
          <span className="flex items-center gap-1.5">
            <UserRound size={13} className="text-faint" />
            <span className="font-semibold text-ink">Your role</span>
            <span className="badge badge-brand">{user.role}</span>
          </span>
          <span className="hidden text-line-strong sm:inline">|</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {STAGES.map((stage, index) => (
              <span key={stage.role} className="flex items-center gap-1.5">
                {index > 0 && <ArrowRight size={11} className="text-line-strong" />}
                <span
                  className={
                    user.role === stage.role || user.role === "ADMIN"
                      ? "font-semibold text-brand-ink"
                      : ""
                  }
                >
                  {stage.label}
                </span>
                <span className="text-faint">{stage.detail}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <Section
        title="Awaiting your action"
        description="Runs you can act on now. Open a run to record your decision."
        items={actionable}
        empty="Nothing is waiting on you. The next stage belongs to another role."
        highlight
      />

      {blockedBySegregation.length > 0 && (
        <section className="mb-4" aria-labelledby="sod-title">
          <div className="mb-2.5 flex items-baseline justify-between gap-2">
            <div>
              <h2 id="sod-title" className="text-[13px] font-semibold text-ink">
                Blocked by segregation of duties
              </h2>
              <p className="text-[11px] text-muted">
                You recorded the previous stage, so a different person must act next.
              </p>
            </div>
            <span className="badge badge-amber">{blockedBySegregation.length}</span>
          </div>
          <div className="mb-2.5 flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--warning)_32%,transparent)] bg-warning-soft px-3 py-2.5 text-[11.5px] leading-relaxed text-warning-ink">
            <Lock size={13} className="mt-0.5 shrink-0" />
            <span>
              Segregation of duties prevents the same person from recording two consecutive stages
              of the same run. Ask another reviewer or approver to continue the chain.
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {blockedBySegregation.map((item) => (
              <QueueCard key={item.run.id} item={item} state="blocked" />
            ))}
          </div>
        </section>
      )}

      <Section
        title="In the sign-off chain"
        description="Open runs waiting for another role."
        items={others}
        empty="No open runs are waiting on other roles."
      />

      <section className="card overflow-hidden" aria-labelledby="approved-title">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 id="approved-title" className="panel-title">
              Recently approved
            </h2>
            <p className="panel-subtitle mt-0.5">
              The approved classification is the current fleet position.
            </p>
          </div>
          <Link href="/runs?status=approved" className="btn btn-ghost btn-sm">
            All approved runs <ArrowRight size={12} />
          </Link>
        </div>
        <div className="table-wrap scroll-thin">
          <table className="data">
            <thead>
              <tr>
                <th>Run</th>
                <th>Evaluation date</th>
                <th className="text-right">Assets</th>
                <th className="text-right">Non-Deployable</th>
                <th className="text-right">NRG</th>
                <th className="text-right">Capex</th>
                <th>Sign-off</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {approved.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[12px] text-muted">
                    No approved evaluations yet.
                  </td>
                </tr>
              )}
              {approved.map((run) => (
                <tr key={run.id} className="relative">
                  <td className="whitespace-nowrap">
                    <Link
                      href={`/runs/${run.id}`}
                      className="font-mono text-[12px] font-semibold text-ink after:absolute after:inset-0 after:content-['']"
                    >
                      Run #{run.id}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-muted">{dateLabel(run.evaluationDate)}</td>
                  <td className="mono text-right">{run.summary?.total ?? "—"}</td>
                  <td className="text-right">
                    {run.summary?.nonDeployable ? (
                      <span className="badge badge-nd">{run.summary.nonDeployable}</span>
                    ) : (
                      <span className="text-faint">0</span>
                    )}
                  </td>
                  <td className="text-right">
                    {run.summary?.nrg ? (
                      <span className="badge badge-nrg">{run.summary.nrg}</span>
                    ) : (
                      <span className="text-faint">0</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <InrAmount value={run.summary?.replacementCapexTotal ?? null} compact />
                  </td>
                  <td>
                    <SignOffStepper status={run.status} compact />
                  </td>
                  <td className="w-8 text-faint">
                    <ArrowRight size={14} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-[10.5px] text-faint">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={11} className="text-healthy" />
            Approved runs are locked and auditable
          </span>
          <span>
            {approvedAll.length > approved.length
              ? `Showing the ${approved.length} most recent of ${approvedAll.length}`
              : `${approvedAll.length} approved run${approvedAll.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </section>
    </>
  );
}

function Section({
  title,
  description,
  items,
  empty,
  highlight,
}: {
  title: string;
  description: string;
  items: ApprovalQueueItem[];
  empty: string;
  highlight?: boolean;
}) {
  return (
    <section className="mb-4" aria-labelledby={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <div>
          <h2
            id={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
            className="text-[13px] font-semibold text-ink"
          >
            {title}
          </h2>
          <p className="text-[11px] text-muted">{description}</p>
        </div>
        <span className="badge badge-slate">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-panel px-4 py-6 text-center text-[12px] text-muted">
          {empty}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <QueueCard key={item.run.id} item={item} state={highlight ? "actionable" : "waiting"} />
          ))}
        </div>
      )}
    </section>
  );
}

function QueueCard({
  item,
  state,
}: {
  item: ApprovalQueueItem;
  state: "actionable" | "waiting" | "blocked";
}) {
  const summary = (item.run.summary ?? {}) as ImportSummary;
  const last = item.approvals.at(-1);
  const required = requiredRole(item.run.status);

  const tone =
    state === "actionable"
      ? "border-[color-mix(in_srgb,var(--brand)_28%,transparent)] bg-brand-soft/40"
      : state === "blocked"
        ? "border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-warning-soft/30"
        : "";

  return (
    <Link
      href={`/runs/${item.run.id}`}
      className={`card block p-4 transition hover:border-line-strong hover:shadow-[var(--shadow-md)] ${tone}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] font-semibold text-ink">
              Run #{item.run.id}
            </span>
            <StatusBadge status={item.run.status} />
          </div>
          <div className="mt-0.5 truncate text-[11.5px] text-muted">
            Evaluation {dateLabel(item.run.evaluationDate)}
            {item.filename ? ` · ${item.filename}` : ""}
          </div>
        </div>
        <ArrowRight size={15} className="mt-1 shrink-0 text-faint" />
      </div>

      <div className="mt-2.5">
        <SignOffStepper status={item.run.status} compact />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="badge badge-slate">{summary.total ?? 0} assets</span>
        <span className="badge badge-nd">{summary.nonDeployable ?? 0} Non-Deployable</span>
        <span className="badge badge-nrg">{summary.nrg ?? 0} NRG</span>
        <span className="badge badge-old">{summary.oldFleet ?? 0} Old Fleet</span>
        <span className="badge badge-slate">
          {inrCompact(summary.replacementCapexTotal ?? null)} capex
        </span>
      </div>

      {last ? (
        <div className="mt-3 rounded-lg border border-line bg-panel-2 px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium text-ink">
            {last.action === "RETURN" ? (
              <RotateCcw size={12} className="text-nd" />
            ) : (
              <CheckCircle2 size={12} className="text-healthy" />
            )}
            {last.action === "RETURN" ? "Returned" : (last.stage || last.action)} by{" "}
            {last.actorName ?? "—"}
            <span className="font-normal text-faint">{dateTimeLabel(last.actedAt)}</span>
          </div>
          {last.comment && (
            <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted">
              {last.comment}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-faint">
          <BadgeCheck size={13} /> Awaiting first sign-off
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5 text-[11px]">
        <span className="text-muted">
          Next: <strong className="text-ink">{required ?? "—"}</strong>
        </span>
        <span className="font-semibold text-brand-ink">
          {state === "actionable"
            ? "Open to act →"
            : state === "blocked"
              ? "View run →"
              : "View run →"}
        </span>
      </div>
    </Link>
  );
}
