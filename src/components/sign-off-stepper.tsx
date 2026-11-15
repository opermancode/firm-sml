import { Check, Clock3, RotateCcw } from "lucide-react";
import { STAGE_LABELS } from "@/lib/workflow";

const STAGES = ["PREPARED", "REVIEWED", "APPROVED"] as const;

export function SignOffStepper({
  status,
  compact = false,
}: {
  status: string;
  compact?: boolean;
}) {
  const index =
    status === "PENDING" || status === "RETURNED" ? -1 : STAGES.indexOf(status as (typeof STAGES)[number]);
  const returned = status === "RETURNED";

  return (
    <div className={`flex items-center ${compact ? "gap-1" : "gap-2"}`} aria-label="Sign-off progress">
      {STAGES.map((stage, i) => {
        const done = index > i;
        const current = index === i;
        return (
          <div key={stage} className="flex items-center gap-1.5">
            <div
              className={`flex items-center gap-1.5 rounded-full border ${
                compact ? "h-1.5 w-7 border-0 px-0" : "px-2.5 py-1"
              } ${
                done
                  ? "border-healthy/30 bg-healthy-soft text-healthy-ink"
                  : current
                    ? "border-brand/30 bg-brand-soft text-brand-ink"
                    : "border-line bg-panel-2 text-faint"
              }`}
              title={STAGE_LABELS[stage]}
            >
              {!compact && (
                <>
                  {done ? (
                    <Check size={11} />
                  ) : current ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  ) : returned && i === 0 ? (
                    <RotateCcw size={10} />
                  ) : (
                    <Clock3 size={10} />
                  )}
                  <span className="text-[10px] font-semibold">{STAGE_LABELS[stage]}</span>
                </>
              )}
            </div>
            {i < STAGES.length - 1 && (
              <span className={compact ? "text-[8px] text-line-strong" : "text-[10px] text-line-strong"}>
                ›
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
