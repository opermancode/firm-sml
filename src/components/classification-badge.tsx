import {
  AlertTriangle,
  CircleX,
  Clock3,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import { CLASS_LABELS } from "@/lib/classify";

const CLASS_META: Record<
  string,
  { className: string; icon: typeof CircleX; short: string }
> = {
  NON_DEPLOYABLE: { className: "badge-nd", icon: CircleX, short: "Non-Deployable" },
  NRG: { className: "badge-nrg", icon: TrendingDown, short: "NRG" },
  NRG_REVIEW: { className: "badge-amber", icon: AlertTriangle, short: "NRG Review" },
  OLD_FLEET: { className: "badge-old", icon: Clock3, short: "Old Fleet" },
  HEALTHY: { className: "badge-healthy", icon: ShieldCheck, short: "Healthy" },
};

export function ClassificationBadge({
  value,
  withIcon = true,
}: {
  value: string;
  withIcon?: boolean;
}) {
  const meta = CLASS_META[value] ?? {
    className: "badge-slate",
    icon: ShieldCheck,
    short: value,
  };
  const Icon = meta.icon;
  return (
    <span className={`badge ${meta.className}`} title={CLASS_LABELS[value as keyof typeof CLASS_LABELS] ?? value}>
      {withIcon && <Icon size={11} />}
      {meta.short}
    </span>
  );
}

export const PRIMARY_CLASS_ORDER = [
  "NON_DEPLOYABLE",
  "NRG",
  "NRG_REVIEW",
  "OLD_FLEET",
  "HEALTHY",
] as const;

const NRG_STATUS_META: Record<string, { className: string; label: string }> = {
  nrg: { className: "badge-nrg", label: "NRG confirmed" },
  not_nrg: { className: "badge-healthy", label: "Not NRG" },
  potential: { className: "badge-amber", label: "Potential NRG" },
  insufficient: { className: "badge-slate", label: "Insufficient data" },
};

export function NrgStatusBadge({ status }: { status: string }) {
  const meta = NRG_STATUS_META[status] ?? { className: "badge-slate", label: status };
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}
