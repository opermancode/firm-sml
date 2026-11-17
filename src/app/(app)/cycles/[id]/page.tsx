import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCycles, getCranes } from "@/lib/firm/api";
import { PageHeader } from "@/components/page-header";
import { StatusChip } from "@/components/status-chip";
import { STATUSES, STATUS_MAP } from "@/lib/firm/workflow";
import { dateLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CycleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [cycles, all] = await Promise.all([getCycles(), getCranes({ cycleId: id })]);
  const cycle = cycles.find((entry) => entry.id === id);
  if (!cycle) notFound();

  return (
    <>
      <Link href="/cycles" className="mb-4 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-brand hover:underline">
        <ArrowLeft size={13} /> All cycles
      </Link>
      <PageHeader
        eyebrow={`Cycle ${cycle.id}`}
        title={cycle.name}
        description={`Evaluation date ${dateLabel(cycle.evaluationDate)} · opened by ${cycle.openedBy} · ${cycle.status}`}
        help="The status breakdown shows how many cranes sit at each of the 20 steps in this cycle."
        actions={<Link href="/import" className="btn btn-secondary">Upload fleet</Link>}
      />

      <div className="card p-4">
        <h2 className="panel-title">Status breakdown</h2>
        <p className="panel-subtitle mt-1">{all.total} cranes in this cycle.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STATUSES.map((status) => {
            const count = all.byStatus.find((entry) => entry.code === status.code)?.count ?? 0;
            return (
              <Link
                key={status.code}
                href={`/cranes?status=${status.code}`}
                className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${count ? "border-line bg-panel-2 hover:border-brand" : "border-dashed border-line opacity-50"}`}
              >
                <StatusChip status={status.code} compact />
                <span className="text-[12px] font-bold tabular-nums text-ink">{count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="panel-title">Cranes in this cycle</h2>
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-line bg-panel-2 text-[10px] font-bold uppercase tracking-[0.08em] text-faint">
                <th className="px-3 py-2.5">Equipment ID</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Layer</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {all.rows.map((crane) => (
                <tr key={crane.id} className="text-[12px] hover:bg-panel-2">
                  <td className="px-3 py-2.5 font-semibold text-brand">{crane.equipmentId}</td>
                  <td className="px-3 py-2.5 text-muted">{crane.description}</td>
                  <td className="px-3 py-2.5"><StatusChip status={crane.status} /></td>
                  <td className="px-3 py-2.5 text-muted">{STATUS_MAP[crane.status].layer}</td>
                  <td className="px-3 py-2.5 text-muted">{STATUS_MAP[crane.status].type}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Link href={`/cranes/${crane.id}`} className="text-[11px] font-semibold text-brand hover:underline">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
