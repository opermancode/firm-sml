import Link from "next/link";
import { AlertTriangle, Boxes, Info } from "lucide-react";
import { getModelStats } from "@/lib/api";
import { BUCKET_COUNTS, MODEL_COUNT, MODEL_MASTER, lookupModel } from "@/lib/models";
import { PageHeader } from "@/components/page-header";
import { ModelTable, type ModelTableRow } from "@/components/model-table";
import { EmptyState } from "@/components/empty-state";
import { InrAmount } from "@/components/inr-amount";

export const dynamic = "force-dynamic";

const BUCKETS = [15, 20, 25] as const;

const BUCKET_META: Record<
  (typeof BUCKETS)[number],
  { title: string; description: string; accent: string; badge: string }
> = {
  15: {
    title: "15-year threshold",
    description:
      "Hydraulic mobile telescopic and lighter crawler cranes retired from deployment after 15 years.",
    accent: "var(--nrg-review)",
    badge: "badge-amber",
  },
  20: {
    title: "20-year threshold",
    description: "Mid-size telescopic and lattice-boom cranes with a 20-year deployable life.",
    accent: "var(--info)",
    badge: "badge-info",
  },
  25: {
    title: "25-year threshold",
    description: "Heavy-lift crawler and large telescopic cranes with a 25-year deployable life.",
    accent: "var(--old)",
    badge: "badge-old",
  },
};

export default async function ModelsPage() {
  const stats = await getModelStats();
  const fleetModels = [...stats.keys()];
  const unknown = fleetModels.filter((model) => !lookupModel(model));

  const bucketRows = (bucket: (typeof BUCKETS)[number]): ModelTableRow[] =>
    MODEL_MASTER.filter((entry) => entry.threshold === bucket)
      .sort((a, b) => a.model.localeCompare(b.model))
      .map((entry) => {
        const row = stats.get(entry.model);
        return {
          model: entry.model,
          threshold: entry.threshold,
          total: row?.total ?? 0,
          oldFleet: row?.oldFleet ?? 0,
          nonDeployable: row?.nonDeployable ?? 0,
          nrg: row?.nrg ?? 0,
          capex: row?.capex ?? 0,
        };
      });

  return (
    <>
      <PageHeader
        eyebrow="Approved master"
        title="Model master"
        description={`The ${MODEL_COUNT} equipment models named in the FIRM definition, with the model-specific age threshold used by the Non-Deployable test. Uploaded models are validated against this list.`}
        actions={
          <Link href="/settings" className="btn btn-secondary">
            Policy settings
          </Link>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {BUCKETS.map((bucket) => {
          const meta = BUCKET_META[bucket];
          const models = MODEL_MASTER.filter((entry) => entry.threshold === bucket);
          const inFleet = models.reduce((sum, entry) => sum + (stats.get(entry.model)?.total ?? 0), 0);
          const capex = models.reduce((sum, entry) => sum + (stats.get(entry.model)?.capex ?? 0), 0);
          return (
            <div key={bucket} className="card relative overflow-hidden p-4">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ background: meta.accent, opacity: 0.8 }}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="stat-label">{meta.title}</div>
                <span className={`badge ${meta.badge}`}>{BUCKET_COUNTS[bucket]} models</span>
              </div>
              <div className="stat-value mt-1.5">{inFleet}</div>
              <div className="mt-1 text-[11px] text-muted">cranes in the current fleet</div>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2 text-[10.5px]">
                <span className="text-faint">Replacement capex</span>
                <InrAmount value={capex} compact />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--info)_26%,transparent)] bg-info-soft px-4 py-3 text-[11.5px] leading-relaxed text-info-ink">
        <Info size={15} className="mt-0.5 shrink-0" />
        <div>
          Age is measured from Year of Manufacture to the evaluation date. A crane above its model
          threshold is <strong>Non-Deployable</strong>. The flat Old Fleet age test is separate —
          see{" "}
          <Link href="/settings" className="font-semibold underline">
            policy settings
          </Link>
          .
        </div>
      </div>

      {unknown.length > 0 && (
        <section className="card mb-4 overflow-hidden" aria-labelledby="unknown-title">
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-warning-soft/50 px-4 py-3">
            <AlertTriangle size={15} className="text-warning" />
            <div className="min-w-0">
              <h2 id="unknown-title" className="panel-title">
                Models in the fleet that are not in the approved master
              </h2>
              <p className="panel-subtitle mt-0.5">
                These models are imported with a warning and no model-specific age threshold is
                applied.
              </p>
            </div>
            <span className="badge badge-amber ml-auto">{unknown.length}</span>
          </div>
          <div className="table-wrap scroll-thin">
            <table className="data">
              <thead>
                <tr>
                  <th>Model as uploaded</th>
                  <th className="text-right">Cranes</th>
                  <th className="text-right">Old Fleet</th>
                  <th className="text-right">Non-Deployable</th>
                  <th className="text-right">NRG</th>
                  <th className="text-right">Capex</th>
                </tr>
              </thead>
              <tbody>
                {unknown.map((model) => {
                  const entry = stats.get(model);
                  return (
                    <tr key={model}>
                      <td className="font-medium text-ink">{model}</td>
                      <td className="mono text-right">{entry?.total ?? 0}</td>
                      <td className="text-right">
                        {entry?.oldFleet ? (
                          <span className="badge badge-old">{entry.oldFleet}</span>
                        ) : (
                          <span className="text-faint">0</span>
                        )}
                      </td>
                      <td className="text-right">
                        {entry?.nonDeployable ? (
                          <span className="badge badge-nd">{entry.nonDeployable}</span>
                        ) : (
                          <span className="text-faint">0</span>
                        )}
                      </td>
                      <td className="text-right">
                        {entry?.nrg ? (
                          <span className="badge badge-nrg">{entry.nrg}</span>
                        ) : (
                          <span className="text-faint">0</span>
                        )}
                      </td>
                      <td className="text-right">
                        <InrAmount value={entry?.capex ?? 0} compact />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-[10.5px] text-warning-ink">
            Correct the model name in the source workbook, or update the master, then re-import.
          </div>
        </section>
      )}

      <div className="space-y-4">
        {BUCKETS.map((bucket) => {
          const meta = BUCKET_META[bucket];
          const rows = bucketRows(bucket);
          return (
            <section key={bucket} className="space-y-2" aria-labelledby={`bucket-${bucket}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <Boxes size={15} className="text-faint" />
                  <h2 id={`bucket-${bucket}`} className="panel-title">
                    {meta.title}
                  </h2>
                  <span className={`badge ${meta.badge}`}>{rows.length} models</span>
                </div>
                <p className="text-[10.5px] text-faint">{meta.description}</p>
              </div>
              {rows.length === 0 ? (
                <EmptyState
                  tone="muted"
                  title="No models in this bucket"
                  description="The approved master has no models with this age threshold."
                />
              ) : (
                <ModelTable rows={rows} csvFilename={`firm-models-${bucket}y.csv`} />
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
