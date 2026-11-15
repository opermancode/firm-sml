"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { reclassifyFleet } from "@/app/actions/runs";
import { ConfirmDialog } from "@/components/confirm-dialog";

const todayIso = () => new Date().toISOString().slice(0, 10);

export function ReclassifyButton({ label = "Reclassify current fleet" }: { label?: string }) {
  const router = useRouter();
  const [evaluationDate, setEvaluationDate] = useState(todayIso());
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    const formData = new FormData();
    formData.set("evaluationDate", evaluationDate);

    startTransition(async () => {
      const result = await reclassifyFleet(null, formData);
      if (result?.error) {
        setError(result.error);
        toast.error("Classification not run", { description: result.error });
        return;
      }
      setError(null);
      toast.success(`Evaluation run #${result?.runId} created`, {
        description: "The new run is waiting for preparation in the sign-off chain.",
      });
      if (result?.runId) router.push(`/runs/${result.runId}`);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-[170px]">
          <label className="label" htmlFor="reclassifyDate">
            Evaluation date
          </label>
          <input
            id="reclassifyDate"
            type="date"
            className="input"
            value={evaluationDate}
            max={todayIso()}
            disabled={pending}
            onChange={(event) => setEvaluationDate(event.target.value)}
          />
        </div>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Run a new classification?"
          description={
            <>
              The saved policy is applied to the current fleet data and a new evaluation run is
              created for sign-off on{" "}
              <strong className="text-ink">{evaluationDate || "the selected date"}</strong>. The
              current run and its approvals are not modified.
            </>
          }
          confirmLabel="Create run"
          onConfirm={run}
        >
          <div className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-[11.5px] leading-relaxed text-muted">
            The new run starts at <strong className="text-ink">Pending preparation</strong> and must
            pass Prepared → Reviewed → Approved before it becomes the current fleet position.
          </div>
        </ConfirmDialog>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={pending || !evaluationDate}
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {pending ? "Classifying…" : label}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[11px] text-nd-ink">
          {error}
        </p>
      )}
    </div>
  );
}
