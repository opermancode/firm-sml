import { BadgeCheck, FileSignature, RotateCcw } from "lucide-react";
import { dateTimeLabel } from "@/lib/format";

export interface TimelineEntry {
  id: number;
  action: string;
  stage: string;
  actorName: string | null;
  designation: string | null;
  actedAt: Date | string;
  comment: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  PREPARE: "Prepared",
  REVIEW: "Reviewed",
  APPROVE: "Approved",
  RETURN: "Returned for rework",
};

export function SignOffTimeline({
  approvals,
  emptyText = "No sign-off recorded yet. The run is waiting for the preparer.",
}: {
  approvals: TimelineEntry[];
  emptyText?: string;
}) {
  if (approvals.length === 0) {
    return (
      <p className="mt-2 flex items-start gap-2 text-[12px] leading-relaxed text-muted">
        <FileSignature size={14} className="mt-0.5 shrink-0 text-faint" />
        {emptyText}
      </p>
    );
  }

  return (
    <ol className="relative mt-4 space-y-5 border-l border-line pl-5">
      {approvals.map((entry) => {
        const returned = entry.action === "RETURN";
        return (
          <li key={entry.id} className="relative">
            <span
              className={`absolute -left-[27px] flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-panel ${
                returned ? "bg-nd" : "bg-healthy"
              }`}
            >
              {returned ? (
                <RotateCcw size={8} className="text-white" />
              ) : (
                <BadgeCheck size={8} className="text-white" />
              )}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span
                className={`text-[12px] font-semibold ${returned ? "text-nd-ink" : "text-healthy-ink"}`}
              >
                {ACTION_LABEL[entry.action] ?? entry.action}
              </span>
              <span className="text-[11px] text-muted">
                {entry.actorName ?? "—"}
                {entry.designation ? ` · ${entry.designation}` : ""}
              </span>
              <span className="text-[10px] text-faint">{dateTimeLabel(entry.actedAt)}</span>
            </div>
            {entry.comment && (
              <p className="mt-1.5 rounded-lg border border-line bg-panel-2 px-2.5 py-2 text-[11.5px] leading-relaxed text-muted">
                {entry.comment}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
