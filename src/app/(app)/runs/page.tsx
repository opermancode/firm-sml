import Link from "next/link";
import { ArrowRight, ClipboardList, ShieldCheck, UploadCloud } from "lucide-react";
import { getRuns } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { SignOffStepper } from "@/components/sign-off-stepper";
import { InrAmount } from "@/components/inr-amount";
import { dateLabel, dateTimeLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS = [
  { key: "all", label: "All runs" },
  { key: "open", label: "In sign-off" },
  { key: "approved", label: "Approved" },
  { key: "returned", label: "Returned" },
] as const;

const OPEN_STATUSES = ["PENDING", "PREPARED", "REVIEWED"];

function matches(run: { status: string }, tab: string) {
  if (tab === "open") return OPEN_STATUSES.includes(run.status);
  if (tab === "approved") return run.status === "APPROVED";
  if (tab === "returned") return run.status === "RETURNED";
  return true;
}

export default async function RunsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const raw = sp.status;
  const requested = (Array.isArray(raw) ? raw[0] : raw) ?? "all";
  const status = TABS.some((tab) => tab.key === requested) ? requested : "all";

  const allRuns = await getRuns(200);
  const runs = allRuns.filter((run) => matches(run, status));

  const counts = {
    all: allRuns.length,
    open: allRuns.filter((run) => matches(run, "open")).length,
    approved: allRuns.filter((run) => matches(run, "approved")).length,
    returned: allRuns.filter((run) => matches(run, "returned")).length,
  };

  return (
    <>
      <PageHeader
        eyebrow="Evaluation history"
        title="Evaluation runs"
        description="Every import creates an immutable evaluation run with its policy snapshot, classification results and sign-off trail. Approved runs set the fleet date shown in the top bar."
        actions={
          <Link href="/import" className="btn btn-primary">
            <UploadCloud size={14} /> New import
          </Link>
        }
      />

      <div className="card mb-4 overflow-hidden">
        <div className="scroll-thin flex gap-1 overflow-x-auto border-b border-line px-3 pt-2">
          {TABS.map((tab) => {
            const active = status === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.key === "all" ? "/runs" : `/runs?status=${tab.key}`}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2.5 text-[12.5px] font-medium transition ${
                  active
                    ? "border-brand text-brand-ink"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {tab.label}
                <span
                  className={`tnum rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active ? "bg-brand-soft text-brand-ink" : "bg-panel-3 text-faint"
                  }`}
                >
                  {counts[tab.key]}
                </span>
              </Link>
            );
          })}
        </div>
        <p className="px-4 py-2.5 text-[11px] text-faint">
          Runs cannot be edited or deleted. A correction is a new import, which creates a new run
          with its own sign-off chain.
        </p>
      </div>

      {runs.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={22} />}
          tone={allRuns.length === 0 ? "brand" : "muted"}
          title={allRuns.length === 0 ? "No evaluation runs yet" : "No runs match this filter"}
          description={
            allRuns.length === 0
              ? "Import a fleet workbook to create the first evaluation run. Each run keeps the policy and data used at that point in time."
              : "Try a different status filter. All runs remain available under the All runs tab."
          }
          actions={
            allRuns.length === 0 ? (
              <Link href="/import" className="btn btn-primary">
                <UploadCloud size={14} /> Import fleet data
              </Link>
            ) : (
              <Link href="/runs" className="btn btn-secondary">
                Show all runs
              </Link>
            )
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrap scroll-thin">
            <table className="data">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Evaluation date</th>
                  <th>Source file</th>
                  <th className="text-right">Assets</th>
                  <th className="text-right">Non-Deployable</th>
                  <th className="text-right">NRG</th>
                  <th className="text-right">Capex</th>
                  <th>Status</th>
                  <th>Sign-off</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const summary = run.summary;
                  return (
                    <tr key={run.id} className="relative">
                      <td className="whitespace-nowrap">
                        <Link
                          href={`/runs/${run.id}`}
                          className="font-mono text-[12px] font-semibold text-ink after:absolute after:inset-0 after:content-['']"
                        >
                          Run #{run.id}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-muted">
                        {dateLabel(run.evaluationDate)}
                      </td>
                      <td className="max-w-[240px]">
                        <span className="block truncate text-[11.5px] text-muted">
                          {run.filename ?? "—"}
                        </span>
                      </td>
                      <td className="mono text-right">{summary?.total ?? "—"}</td>
                      <td className="text-right">
                        {summary?.nonDeployable ? (
                          <span className="badge badge-nd">{summary.nonDeployable}</span>
                        ) : (
                          <span className="text-faint">0</span>
                        )}
                      </td>
                      <td className="text-right">
                        {summary?.nrg ? (
                          <span className="badge badge-nrg">{summary.nrg}</span>
                        ) : (
                          <span className="text-faint">0</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <InrAmount value={summary?.replacementCapexTotal ?? null} compact />
                      </td>
                      <td>
                        <StatusBadge status={run.status} />
                      </td>
                      <td>
                        <SignOffStepper status={run.status} compact />
                      </td>
                      <td className="whitespace-nowrap text-[11px] text-faint">
                        {dateTimeLabel(run.createdAt)}
                      </td>
                      <td className="w-8 text-faint">
                        <ArrowRight size={14} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
            <span className="text-[11px] text-faint">
              Showing {runs.length} of {allRuns.length} run{allRuns.length === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1.5 text-[10.5px] text-faint">
              <ShieldCheck size={11} className="text-healthy" />
              Approved runs are locked and auditable
            </span>
          </div>
        </div>
      )}
    </>
  );
}
