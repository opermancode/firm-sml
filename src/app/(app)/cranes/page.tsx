import Link from "next/link";
import { Filter, Search, Truck } from "lucide-react";
import { getCranes } from "@/lib/firm/api";
import { PageHeader } from "@/components/page-header";
import { StatusChip, FlagChip } from "@/components/status-chip";
import { EmptyState } from "@/components/empty-state";
import {
  CATEGORY_LABEL, STATUSES, STATUS_MAP,
  type FinalCategory,
} from "@/lib/firm/workflow";
import { requireUser } from "@/lib/auth";
import { DensityToggle } from "@/components/dashboard/density-toggle";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function CranesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;
  const filters = {
    q: one(params.q),
    status: one(params.status),
    layer: one(params.layer),
    category: one(params.category),
    type: one(params.type),
  };
  const result = await getCranes(filters);

  return (
    <>
      <PageHeader
        eyebrow="FIRM cycle"
        title="Crane register"
        description="Every crane in the cycle with its single current status, final category and SAP execution date. Click a row for the full record."
        help="Each crane has exactly one of 20 statuses. Filters combine; the table scrolls horizontally on small screens."
        actions={
          <>
            <DensityToggle />
            <Link href="/import" className="btn btn-primary">
              <Truck size={14} /> Upload fleet
            </Link>
          </>
        }
      />

      <div className="card mb-4 p-3">
        <form method="get" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input name="q" defaultValue={filters.q} placeholder="Equipment ID or description" className="input h-9 pl-9" aria-label="Search cranes" />
          </div>
          <select name="status" defaultValue={filters.status} className="select h-9" aria-label="Status">
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status.code} value={status.code}>{status.code} · {status.name}</option>
            ))}
          </select>
          <select name="layer" defaultValue={filters.layer} className="select h-9" aria-label="Layer">
            <option value="">All layers</option>
            {["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"].map((layer) => (
              <option key={layer} value={layer}>{layer}</option>
            ))}
          </select>
          <select name="category" defaultValue={filters.category} className="select h-9" aria-label="Final category">
            <option value="">All categories</option>
            {(Object.keys(CATEGORY_LABEL) as FinalCategory[]).map((category) => (
              <option key={category} value={category}>{CATEGORY_LABEL[category]}</option>
            ))}
          </select>
          <select name="type" defaultValue={filters.type} className="select h-9" aria-label="Status type">
            <option value="">All types</option>
            {["Active", "Approval", "On Hold", "Locked", "Closed"].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-5">
            <button type="submit" className="btn btn-primary h-9"><Filter size={13} /> Apply filters</button>
            <Link href="/cranes" className="btn btn-ghost h-9">Clear</Link>
            <span className="ml-auto text-[12px] text-muted">
              {result.total} crane{result.total === 1 ? "" : "s"} · {result.counts.approval} awaiting approval · {result.counts.locked} locked
            </span>
          </div>
        </form>
      </div>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={<Truck size={19} />}
          title="No cranes match these filters"
          description="Try clearing a filter, or upload a new fleet to start a cycle."
          actions={<Link href="/cranes" className="btn btn-secondary">Clear filters</Link>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scroll-thin">
            <table id="crane-table" className="w-full min-w-[1120px] text-left">
              <thead>
                <tr className="border-b border-line bg-panel-2 text-[12px] font-bold uppercase tracking-[0.08em] text-faint">
                  <th className="px-3 py-2.5">Equipment</th>
                  <th className="px-3 py-2.5">YOM / Age</th>
                  <th className="px-3 py-2.5">Final category</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Flags</th>
                  <th className="px-3 py-2.5">SAP SO</th>
                  <th className="px-3 py-2.5">Execution allowed from</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.rows.map((crane) => {
                  const meta = STATUS_MAP[crane.status];
                  return (
                    <tr key={crane.id} className="text-[12px] transition hover:bg-panel-2">
                      <td className="px-3 py-2.5">
                        <Link href={`/cranes/${crane.id}`} className="font-semibold text-brand hover:underline">
                          {crane.equipmentId}
                        </Link>
                        <div className="max-w-[260px] truncate text-[12px] text-muted">{crane.description}</div>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-muted">{crane.yom} <span className="text-faint">({crane.age}y)</span></td>
                      <td className="px-3 py-2.5">
                        {crane.finalCategory ? (
                          <span className="text-[12px] font-medium text-ink">{CATEGORY_LABEL[crane.finalCategory]}</span>
                        ) : (
                          <span className="text-[12px] text-faint">Not finalised</span>
                        )}
                        {crane.finalOverride && <div className="text-[12px] text-old">Override · written reason</div>}
                      </td>
                      <td className="px-3 py-2.5"><StatusChip status={crane.status} /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {crane.flags.oldFleet && <FlagChip label="Old Fleet" tone="violet" />}
                          {crane.flags.nrg && <FlagChip label="NRG" tone="orange" />}
                          {crane.flags.nonDeployable && <FlagChip label="Non-Deployable" tone="red" />}
                          {!crane.flags.oldFleet && !crane.flags.nrg && !crane.flags.nonDeployable && <span className="text-[12px] text-faint">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-muted">{crane.sap.soNumber ?? "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-muted">{crane.sap.soEnd ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`/cranes/${crane.id}`} className="text-[12px] font-semibold text-brand hover:underline">Open</Link>
                        <div className="text-[12px] text-faint">{meta.layer} · {meta.type}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
