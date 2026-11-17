import { STATUS_MAP, type StatusCode } from "@/lib/firm/workflow";

const TONE_CLASS: Record<string, string> = {
  slate: "badge-slate",
  brand: "badge-info",
  orange: "badge-orange",
  amber: "badge-amber",
  violet: "badge-old",
  red: "badge-red",
  green: "badge-healthy",
};

/** S01–S20 status label. Always shows the code and the full name. */
export function StatusChip({
  status,
  compact = false,
  showCode = true,
}: {
  status: StatusCode;
  compact?: boolean;
  showCode?: boolean;
}) {
  const meta = STATUS_MAP[status];
  return (
    <span
      className={`badge ${TONE_CLASS[meta.tone]}`}
      title={`${meta.name} · ${meta.layer} · ${meta.type} · ${meta.impact}`}
    >
      {showCode && (
        <span className="font-mono text-[9.5px] font-bold opacity-70">{meta.code}</span>
      )}
      <span className={compact ? "max-w-[150px] truncate" : ""}>{meta.name}</span>
    </span>
  );
}

export function FlagChip({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "brand" | "orange" | "amber" | "violet" | "red" | "green";
}) {
  return <span className={`badge ${TONE_CLASS[tone]}`}>{label}</span>;
}
