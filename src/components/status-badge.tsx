import {
  CheckCircle2,
  Clock3,
  Eye,
  PenLine,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { RUN_STATUS_LABELS } from "@/lib/workflow";

const STATUS_META: Record<
  string,
  { className: string; icon: typeof Clock3 }
> = {
  PENDING: { className: "badge-slate", icon: Clock3 },
  PREPARED: { className: "badge-info", icon: PenLine },
  REVIEWED: { className: "badge-amber", icon: Eye },
  APPROVED: { className: "badge-healthy", icon: ShieldCheck },
  RETURNED: { className: "badge-nd", icon: RotateCcw },
};

export function StatusBadge({ status, withIcon = true }: { status: string; withIcon?: boolean }) {
  const meta = STATUS_META[status] ?? { className: "badge-slate", icon: Clock3 };
  const Icon = meta.icon;
  return (
    <span className={`badge ${meta.className}`}>
      {withIcon && <Icon size={10.5} />}
      {RUN_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function StagePill({ stage, done }: { stage: string; done: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        done ? "bg-healthy-soft text-healthy-ink" : "bg-panel-3 text-faint"
      }`}
    >
      {done ? <CheckCircle2 size={10} /> : <Clock3 size={10} />}
      {stage}
    </span>
  );
}
