import Link from "next/link";
import { ChevronRight, Download, Search, UploadCloud, X } from "lucide-react";
import { getAssets } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { ClassificationBadge } from "@/components/classification-badge";
import { FlagChips } from "@/components/flag-chip";
import { EmptyState } from "@/components/empty-state";
import { InrAmount } from "@/components/inr-amount";
import { inrCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS = [
  { key: "ALL", label: "All assets", countKey: "all" },
  { key: "FLAGGED", label: "Flagged", countKey: "flagged" },
  { key: "NON_DEPLOYABLE", label: "Non-Deployable", countKey: "nonDeployable" },
  { key: "NRG", label: "NRG", countKey: "nrg" },
  { key: "NRG_REVIEW", label: "NRG review", countKey: "nrgReview" },
  { key: "OLD_FLEET", label: "Old Fleet", countKey: "oldFleet" },
  { key: "HEALTHY", label: "Healthy", countKey: "healthy" },
] as const;

const DATA_LABELS: Record<string, string> = {
  "nrg-insufficient": "NRG not testable",
  "nrg-potential": "Retention pending",
  "missing-capex": "Missing capex",
};

const ROW_ACCENT: Record<string, string> = {
  NON_DEPLOYABLE: "row-accent-nd",
  NRG: "row-accent-nrg",
  NRG_REVIEW: "row-accent-nrg-review",
  OLD_FLEET: "row-accent-old",
};

export default async function AssetsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const value = (key: string) => {
    const raw = sp[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };

  const q = value("q") ?? "";
  const classification = value("classification") ?? "ALL";
  const region = value("region") ?? "";
  const model = value("model") ?? "";
  const sort = value("sort") ?? "risk";
  const data = value("data") ?? "";
  const page = Number(value("page") ?? "1") || 1;

  const result = await getAssets({
    q,
    classification,
    region: region || undefined,
    model: model || undefined,
    sort,
    data: data || undefined,
    page,
    pageSize: 25,
  });

  const current: Record<string, string> = {};
  if (q) current.q = q;
  if (classification !== "ALL") current.classification = classification;
  if (region) current.region = region;
  if (model) current.model = model;
  if (sort !== "risk") current.sort = sort;
  if (data) current.data = data;

  const href = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(current);
    for (const [key, val] of Object.entries(overrides)) {
      if (val == null || val === "") params.delete(key);
      else params.set(key, String(val));
    }
    const query = params.toString();
    return query ? `/assets?${query}` : "/assets";
  };

  const start = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const end = Math.min(result.total, result.page * result.pageSize);
  const exportQuery = new URLSearchParams(current).toString();
  const hasFilters =
    Boolean(q || region || model || data) || classification !== "ALL" || sort !== "risk";

  return (
    <>
      <PageHeader
        eyebrow="Fleet register"
        title="Fleet assets"
        description="Every owned crane with its current classification, performance and replacement capex. Flags can overlap; the primary class follows the severity precedence."
        actions={
          <>
            <a
              href={`/api/export/assets${exportQuery ? `?${exportQuery}` : ""}`}
              className="btn btn-secondary"
            >
              <Download size={14} /> Export CSV
            </a>
            <Link href="/import" className="btn btn-primary">
              <UploadCloud size={14} /> Import data
            </Link>
          </>
        }
      />

      <div className="card mb-4 overflow-hidden">
        <div className="scroll-thin flex gap-1 overflow-x-auto border-b border-line px-3 pt-2">
          {TABS.map((tab) => {
            const active = classification === tab.key;
            return (
              <Link
                key={tab.key}
                href={href({
                  classification: tab.key === "ALL" ? undefined : tab.key,
                  page: undefined,
                })}
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
                  {result.counts[tab.countKey]}
                </span>
              </Link>
            );
          })}
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2.5 px-4 py-3.5">
          {data && <input type="hidden" name="data" value={data} />}
          {classification !== "ALL" && (
            <input type="hidden" name="classification" value={classification} />
          )}
          <div className="min-w-[220px] flex-1">
            <label className="label" htmlFor="q">
              Search
            </label>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                id="q"
                name="q"
                defaultValue={q}
                className="input pl-9"
                placeholder="Asset code, description, model or location"
              />
            </div>
          </div>
          <div className="w-[150px]">
            <label className="label" htmlFor="region">
              Region
            </label>
            <select id="region" name="region" defaultValue={region} className="select">
              <option value="">All regions</option>
              {result.regions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[180px]">
            <label className="label" htmlFor="model">
              Model
            </label>
            <select id="model" name="model" defaultValue={model} className="select">
              <option value="">All models</option>
              {result.models.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[180px]">
            <label className="label" htmlFor="sort">
              Sort by
            </label>
            <select id="sort" name="sort" defaultValue={sort} className="select">
              <option value="risk">Risk, then capex</option>
              <option value="capex">Replacement capex</option>
              <option value="age">Age</option>
              <option value="code">Asset code</option>
            </select>
          </div>
          <button type="submit" className="btn btn-secondary">
            Apply
          </button>
          {hasFilters && (
            <Link href="/assets" className="btn btn-ghost">
              Reset
            </Link>
          )}
        </form>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {data && (
          <span className="badge badge-info">
            Data gap: {DATA_LABELS[data] ?? data}
            <Link href={href({ data: undefined, page: undefined })} aria-label="Clear data filter">
              <X size={12} />
            </Link>
          </span>
        )}
        {region && (
          <span className="badge badge-slate">
            Region: {region}
            <Link href={href({ region: undefined, page: undefined })} aria-label="Clear region">
              <X size={12} />
            </Link>
          </span>
        )}
        {model && (
          <span className="badge badge-slate">
            Model: {model}
            <Link href={href({ model: undefined, page: undefined })} aria-label="Clear model">
              <X size={12} />
            </Link>
          </span>
        )}
        {q && (
          <span className="badge badge-slate">
            Search: “{q}”
            <Link href={href({ q: undefined, page: undefined })} aria-label="Clear search">
              <X size={12} />
            </Link>
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-[12px] text-muted">
        <span>
          <span className="tnum font-semibold text-ink">{result.total}</span> assets
        </span>
        <span>
          <span className="tnum font-semibold text-ink">{inrCompact(result.filteredCapex)}</span>{" "}
          replacement capex
        </span>
        <span className="text-old-ink">{result.filteredOldFleet} Old Fleet</span>
        <span className="text-nd-ink">{result.filteredNonDeployable} Non-Deployable</span>
        <span className="text-nrg-ink">{result.filteredNrg} NRG</span>
      </div>

      {result.total === 0 ? (
        <EmptyState
          tone="muted"
          title="No assets match these filters"
          description="Try a different classification, region or search term. Clearing the filters restores the full register."
          actions={
            <Link href="/assets" className="btn btn-secondary">
              Clear filters
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrap scroll-thin">
            <table className="data">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Model</th>
                  <th>Region / location</th>
                  <th className="text-right">YOM</th>
                  <th>Age vs threshold</th>
                  <th className="text-right">Capex</th>
                  <th className="text-right">Util 3Y avg</th>
                  <th className="text-right">Yield 3Y avg</th>
                  <th>Flags</th>
                  <th>Primary class</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => {
                  const ageRatio =
                    row.ageThreshold != null && row.ageThreshold > 0
                      ? Math.min(100, Math.round((row.ageYears / row.ageThreshold) * 100))
                      : null;
                  const old = row.ageThreshold != null && row.ageYears > row.ageThreshold;
                  return (
                    <tr
                      key={row.code}
                      className={`relative ${ROW_ACCENT[row.primaryClass] ?? ""}`}
                    >
                      <td className="min-w-[190px]">
                        <Link
                          href={`/assets/${encodeURIComponent(row.code)}`}
                          className="block after:absolute after:inset-0 after:content-['']"
                        >
                          <span className="block font-mono text-[12px] font-semibold text-ink">
                            {row.code}
                          </span>
                          <span className="mt-0.5 block max-w-[260px] truncate text-[10.5px] text-faint">
                            {row.description ?? "—"}
                          </span>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="font-medium text-ink">{row.model}</div>
                        <div className="mt-0.5 text-[10px] text-faint">{row.oem ?? "—"}</div>
                      </td>
                      <td className="whitespace-nowrap text-muted">
                        {row.region ?? "—"}
                        <div className="text-[10px] text-faint">{row.location ?? ""}</div>
                      </td>
                      <td className="mono whitespace-nowrap text-right text-ink">{row.yom}</td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`mono text-[11.5px] ${old ? "font-semibold text-old-ink" : "text-muted"}`}>
                            {row.ageYears} yrs
                          </span>
                          {row.ageThreshold != null && (
                            <span className="text-[10px] text-faint">/ {row.ageThreshold}</span>
                          )}
                        </div>
                        {ageRatio != null && (
                          <div className="mt-1 h-1 w-[88px] overflow-hidden rounded-full bg-panel-3">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${ageRatio}%`,
                                background: old ? "var(--old)" : "var(--faint)",
                              }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <InrAmount value={row.replacementCapex} compact />
                      </td>
                      <td className="mono whitespace-nowrap text-right">
                        {row.utilisationAvgPct != null ? (
                          <span
                            className={
                              row.utilisationAvgPct < 60
                                ? "font-semibold text-nd-ink"
                                : "text-ink"
                            }
                          >
                            {row.utilisationAvgPct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td className="mono whitespace-nowrap text-right">
                        {row.monthlyYieldAvgPct != null ? (
                          <span
                            className={
                              row.monthlyYieldAvgPct < 1.8
                                ? "font-semibold text-nd-ink"
                                : "text-ink"
                            }
                          >
                            {row.monthlyYieldAvgPct.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
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
                      <td className="w-6 text-faint">
                        <ChevronRight size={14} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row">
            <div className="text-[11.5px] text-faint">
              Showing <span className="font-medium text-ink">{start}</span>–
              <span className="font-medium text-ink">{end}</span> of{" "}
              <span className="font-medium text-ink">{result.total}</span> · 25 rows per page
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={href({ page: Math.max(1, result.page - 1) })}
                className={`btn btn-secondary btn-sm ${
                  result.page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Previous
              </Link>
              <span className="px-1 text-[11.5px] text-muted">
                Page {result.page} of {result.pages}
              </span>
              <Link
                href={href({ page: Math.min(result.pages, result.page + 1) })}
                className={`btn btn-secondary btn-sm ${
                  result.page >= result.pages ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Next
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
