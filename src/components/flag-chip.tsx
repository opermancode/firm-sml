import { AlertTriangle, Clock3, ShieldCheck, TrendingDown } from "lucide-react";

type FlagTone = "nd" | "nrg" | "nrg-review" | "old" | "healthy";

const TONE_CLASS: Record<FlagTone, string> = {
  nd: "badge-nd",
  nrg: "badge-nrg",
  "nrg-review": "badge-amber",
  old: "badge-old",
  healthy: "badge-healthy",
};

export function FlagChip({
  tone,
  label,
  icon = true,
}: {
  tone: FlagTone;
  label: string;
  icon?: boolean;
}) {
  const Icon =
    tone === "nd"
      ? AlertTriangle
      : tone === "nrg"
        ? TrendingDown
        : tone === "nrg-review"
          ? AlertTriangle
          : tone === "old"
            ? Clock3
            : ShieldCheck;
  return (
    <span className={`badge ${TONE_CLASS[tone]}`}>
      {icon && <Icon size={10.5} />}
      {label}
    </span>
  );
}

export function FlagChips({
  oldFleet,
  nonDeployable,
  nrg,
  nrgStatus,
}: {
  oldFleet: boolean;
  nonDeployable: boolean;
  nrg: boolean;
  nrgStatus?: string;
}) {
  const any = oldFleet || nonDeployable || nrg || nrgStatus === "potential";
  return (
    <div className="flex flex-wrap items-center gap-1">
      {nonDeployable && <FlagChip tone="nd" label="Non-Deployable" />}
      {nrg && <FlagChip tone="nrg" label="NRG" />}
      {!nrg && nrgStatus === "potential" && <FlagChip tone="nrg-review" label="NRG review" />}
      {oldFleet && <FlagChip tone="old" label="Old Fleet" />}
      {!any && <FlagChip tone="healthy" label="Healthy" />}
    </div>
  );
}
