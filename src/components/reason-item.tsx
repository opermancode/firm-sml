import { SeverityIcon } from "@/components/severity-icon";

function numeric(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function ReasonItem({
  severity,
  title,
  detail,
  observed,
  threshold,
}: {
  severity: string;
  title: string;
  detail: string;
  observed?: string | number | null;
  threshold?: string | number | null;
}) {
  const o = numeric(observed);
  const t = numeric(threshold);
  const comparable = o != null && t != null && t !== 0;
  const ratio = comparable ? Math.min(100, Math.max(0, (o / t) * 100)) : null;
  const over = comparable && o > t;
  const tone =
    severity === "critical"
      ? "var(--nd)"
      : severity === "warning"
        ? "var(--warning)"
        : severity === "info"
          ? "var(--info)"
          : "var(--healthy)";

  return (
    <li className="flex gap-2.5 py-2.5">
      <SeverityIcon severity={severity} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-ink">{title}</div>
        <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{detail}</div>

        {(observed != null || threshold != null) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {observed != null && (
              <span className="badge badge-slate">
                <span className="text-faint">Observed</span>
                <strong className="font-semibold text-ink">{String(observed)}</strong>
              </span>
            )}
            {threshold != null && (
              <span className="badge badge-slate">
                <span className="text-faint">Policy</span>
                <strong className="font-semibold text-ink">{String(threshold)}</strong>
              </span>
            )}
          </div>
        )}

        {ratio != null && (
          <div className="mt-2 flex items-center gap-2">
            <div className="bar-track h-1.5 flex-1">
              <div
                className="bar-fill"
                style={{ width: `${ratio}%`, background: over ? tone : "var(--faint)" }}
              />
            </div>
            <span className={`mono text-[9.5px] font-semibold ${over ? "text-nd-ink" : "text-faint"}`}>
              {Math.round(ratio)}% of limit
            </span>
          </div>
        )}
      </div>
    </li>
  );
}
