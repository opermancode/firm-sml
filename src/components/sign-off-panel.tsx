"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Info, Lock, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { submitApproval, type ApprovalState } from "@/app/actions/approvals";
import { RUN_STATUS_LABELS } from "@/lib/workflow";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Action = "PREPARE" | "REVIEW" | "APPROVE" | "RETURN";

interface ActionDef {
  key: Action;
  label: string;
  description: string;
  tone: "primary" | "danger";
  requiresComment: boolean;
}

function actionsFor(status: string, role: string): ActionDef[] {
  const admin = role === "ADMIN";
  if (status === "PENDING" || status === "RETURNED") {
    if (admin || role === "PREPARER") {
      return [
        {
          key: "PREPARE",
          label: status === "RETURNED" ? "Re-prepare for review" : "Prepare & send for review",
          description:
            "Confirm the imported data and classification are complete, then forward the run to the reviewer.",
          tone: "primary",
          requiresComment: false,
        },
      ];
    }
  }
  if (status === "PREPARED") {
    if (admin || role === "REVIEWER") {
      return [
        {
          key: "REVIEW",
          label: "Review & send for approval",
          description:
            "Confirm the classification is correct and forward the run to the approver.",
          tone: "primary",
          requiresComment: false,
        },
        {
          key: "RETURN",
          label: "Return for rework",
          description: "Send the run back to the preparer with the corrections required.",
          tone: "danger",
          requiresComment: true,
        },
      ];
    }
  }
  if (status === "REVIEWED") {
    if (admin || role === "APPROVER") {
      return [
        {
          key: "APPROVE",
          label: "Approve evaluation",
          description: "Record final management approval of this fleet classification.",
          tone: "primary",
          requiresComment: false,
        },
        {
          key: "RETURN",
          label: "Return for rework",
          description: "Send the run back to the reviewer with the corrections required.",
          tone: "danger",
          requiresComment: true,
        },
      ];
    }
  }
  return [];
}

function nextRoleHint(status: string): string {
  if (status === "PENDING" || status === "RETURNED")
    return "The preparer must confirm the import and send it for review.";
  if (status === "PREPARED") return "A reviewer must confirm the classification next.";
  if (status === "REVIEWED") return "An approver must record final management approval next.";
  return "No further action is required.";
}

export function SignOffPanel({
  runId,
  status,
  role,
  userId,
  lastActor,
}: {
  runId: number;
  status: string;
  role: string;
  userId: number;
  lastActor: { actorId: number | null; actorName: string | null } | null;
}) {
  const actions = actionsFor(status, role);
  const formRef = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState<Action>(actions[0]?.key ?? "PREPARE");
  const [comment, setComment] = useState("");
  const [state, formAction, pending] = useActionState<ApprovalState | null, FormData>(
    submitApproval,
    null,
  );

  const selectedDef = actions.find((action) => action.key === selected) ?? actions[0];

  const sodBlocked =
    role !== "ADMIN" && lastActor != null && lastActor.actorId === userId && actions.length > 0;
  const commentMissing = selectedDef?.requiresComment === true && comment.trim().length === 0;
  const disabled = pending || sodBlocked || commentMissing;

  useEffect(() => {
    if (!state) return;
    if (state.ok && state.message) {
      toast.success(state.message);
      setComment("");
    } else if (state.error) {
      toast.error("Sign-off not recorded", { description: state.error });
    }
  }, [state]);

  const submitButtonClass = `btn w-full ${
    selectedDef?.tone === "danger" ? "btn-danger" : "btn-primary"
  }`;

  const submitButton = (
    <button type="submit" className={submitButtonClass} disabled={disabled}>
      {pending ? "Recording…" : selectedDef?.label}
    </button>
  );

  return (
    <section className="card p-4" aria-labelledby="signoff-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="signoff-title" className="panel-title">
          Sign-off
        </h2>
        <span className="badge badge-slate">{RUN_STATUS_LABELS[status] ?? status}</span>
      </div>

      {actions.length === 0 ? (
        <div className="mt-3 rounded-lg border border-line bg-panel-2 px-3 py-3 text-[12px] leading-relaxed text-muted">
          {status === "APPROVED" ? (
            <span className="flex items-start gap-2">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-healthy" />
              <span>
                This evaluation is approved. The approved classification is the current fleet
                position and sets the fleet date in the top bar.
              </span>
            </span>
          ) : (
            <span className="flex items-start gap-2">
              <Lock size={15} className="mt-0.5 shrink-0 text-faint" />
              <span>
                <span className="block font-medium text-ink">
                  No sign-off action for your role at this stage.
                </span>
                {nextRoleHint(status)} You are signed in as {role}.
              </span>
            </span>
          )}
        </div>
      ) : (
        <form ref={formRef} action={formAction} className="mt-3 space-y-3">
          <input type="hidden" name="runId" value={runId} />
          <input type="hidden" name="action" value={selectedDef.key} />

          {actions.length > 1 && (
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Sign-off action">
              {actions.map((action) => {
                const active = selected === action.key;
                return (
                  <button
                    key={action.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelected(action.key)}
                    className={`rounded-lg border px-3 py-2 text-left text-[11.5px] font-semibold transition ${
                      active
                        ? action.tone === "danger"
                          ? "border-[color-mix(in_srgb,var(--nd)_40%,transparent)] bg-nd-soft text-nd-ink"
                          : "border-[color-mix(in_srgb,var(--brand)_40%,transparent)] bg-brand-soft text-brand-ink"
                        : "border-line text-muted hover:border-line-strong hover:text-ink"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {action.key === "RETURN" ? <RotateCcw size={13} /> : null}
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-[11.5px] leading-relaxed text-muted">{selectedDef.description}</p>

          {sodBlocked && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--warning)_32%,transparent)] bg-warning-soft px-3 py-2 text-[11.5px] leading-relaxed text-warning-ink"
            >
              <Lock size={14} className="mt-0.5 shrink-0" />
              <span>
                <strong className="font-semibold">Segregation of duties.</strong> You recorded the
                previous stage of this run ({lastActor?.actorName ?? "you"}). A different person
                must act next — ask another {role.toLowerCase()} to continue the chain.
              </span>
            </div>
          )}

          <div>
            <label className="label" htmlFor="comment">
              Comment{" "}
              {selectedDef.requiresComment ? (
                <span className="text-nd-ink">(required)</span>
              ) : (
                <span className="font-normal text-faint">(optional)</span>
              )}
            </label>
            <textarea
              id="comment"
              name="comment"
              rows={3}
              className="textarea"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              aria-required={selectedDef.requiresComment}
              placeholder={
                selectedDef.requiresComment
                  ? "Explain exactly what needs to be corrected…"
                  : "Add context for the audit trail…"
              }
            />
            {selectedDef.requiresComment && commentMissing && (
              <p className="field-hint text-nd-ink">
                A return cannot be recorded without a reason.
              </p>
            )}
          </div>

          {state?.error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--nd)_30%,transparent)] bg-nd-soft px-3 py-2 text-[11.5px] text-nd-ink"
            >
              <XCircle size={14} className="mt-0.5 shrink-0" /> {state.error}
            </div>
          )}
          {state?.ok && state.message && (
            <div className="flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--healthy)_30%,transparent)] bg-healthy-soft px-3 py-2 text-[11.5px] text-healthy-ink">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> {state.message}
            </div>
          )}

          {selectedDef.key === "APPROVE" ? (
            <ConfirmDialog
              title="Approve this evaluation?"
              description={
                <>
                  Approving run #{runId} locks the classification as the current fleet position and
                  sets the fleet date shown in the top bar. This action is recorded in the audit
                  trail and cannot be undone — a correction requires a new import.
                </>
              }
              confirmLabel="Approve evaluation"
              tone="primary"
              onConfirm={() => formRef.current?.requestSubmit()}
              trigger={
                <button type="button" className={submitButtonClass} disabled={disabled}>
                  {selectedDef.label}
                </button>
              }
            />
          ) : selectedDef.key === "RETURN" ? (
            <ConfirmDialog
              title="Return this run for rework?"
              description={
                <>
                  Run #{runId} goes back to the previous stage with your comment attached. The
                  preparer must correct the data and prepare it again before review.
                </>
              }
              confirmLabel="Return for rework"
              tone="danger"
              onConfirm={() => formRef.current?.requestSubmit()}
              trigger={
                <button type="button" className={submitButtonClass} disabled={disabled}>
                  <RotateCcw size={14} /> {selectedDef.label}
                </button>
              }
            />
          ) : (
            submitButton
          )}

          <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-faint">
            <Info size={11} className="mt-0.5 shrink-0" />
            Every action is timestamped and attributed. The same person cannot record two
            consecutive stages of the same run.
          </p>
        </form>
      )}
    </section>
  );
}
