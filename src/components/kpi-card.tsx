import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type Tone = "brand" | "nd" | "nrg" | "nrg-review" | "old" | "healthy" | "neutral";

const TONE: Record<Tone, { accent: string; soft: string; ink: string }> = {
  brand: { accent: "var(--brand)", soft: "var(--brand-soft)", ink: "var(--brand-ink)" },
  nd: { accent: "var(--nd)", soft: "var(--nd-soft)", ink: "var(--nd-ink)" },
  nrg: { accent: "var(--nrg)", soft: "var(--nrg-soft)", ink: "var(--nrg-ink)" },
  "nrg-review": {
    accent: "var(--nrg-review)",
    soft: "var(--nrg-review-soft)",
    ink: "var(--nrg-review-ink)",
  },
  old: { accent: "var(--old)", soft: "var(--old-soft)", ink: "var(--old-ink)" },
  healthy: { accent: "var(--healthy)", soft: "var(--healthy-soft)", ink: "var(--healthy-ink)" },
  neutral: { accent: "var(--faint)", soft: "var(--panel-3)", ink: "var(--muted)" },
};

export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = "neutral",
  href,
  note,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  href?: string;
  note?: string;
}) {
  const palette = TONE[tone];
  const body = (
    <div className="card group relative h-full overflow-hidden p-4 transition hover:border-line-strong hover:shadow-[var(--shadow-md)]">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: palette.accent, opacity: 0.85 }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="stat-label">{label}</div>
          <div className="stat-value mt-1.5">{value}</div>
        </div>
        {icon && (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: palette.soft, color: palette.ink }}
          >
            {icon}
          </div>
        )}
      </div>
      {sub && <div className="mt-2 text-[11.5px] leading-snug text-muted">{sub}</div>}
      {note && <div className="mt-1 text-[10.5px] leading-snug text-faint">{note}</div>}
      {href && (
        <ArrowUpRight
          size={13}
          className="absolute bottom-3 right-3 text-faint opacity-0 transition group-hover:opacity-100"
        />
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block rounded-[14px] focus-visible:ring-2 focus-visible:ring-brand">
      {body}
    </Link>
  ) : (
    body
  );
}
