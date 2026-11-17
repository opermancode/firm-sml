"use client";

import { useActionState, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { craneAction, type ActionState } from "@/app/actions/firm";
import type { Role } from "@/lib/firm/workflow";

const ALLOWED: Record<string, Role[]> = {
  SUBMIT_SALES: ["SALES"],
  SUBMIT_MAINTENANCE: ["MAINTENANCE"],
  FINALISE_LIST: ["FINANCE", "GLOBAL_ADMIN"],
  APPROVE_AWARD: ["STRATEGY", "CSO", "GLOBAL_ADMIN"],
  REJECT_AWARD: ["STRATEGY", "CSO", "GLOBAL_ADMIN"],
  APPROVE_SALE: ["CBO", "MD", "GLOBAL_ADMIN"],
  REJECT_SALE: ["CBO", "MD", "GLOBAL_ADMIN"],
  APPROVE_SCRAP: ["MD", "CBO", "GLOBAL_ADMIN"],
  REJECT_SCRAP: ["MD", "CBO", "GLOBAL_ADMIN"],
  APPROVE_CLAIM: ["CBO", "CSO", "SALES", "STRATEGY", "GLOBAL_ADMIN"],
  REJECT_CLAIM: ["CBO", "CSO", "SALES", "STRATEGY", "GLOBAL_ADMIN"],
  RESOLVE_CONFLICT: ["CBO", "CSO", "STRATEGY", "MD", "GLOBAL_ADMIN"],
  DEPLOY: ["STRATEGY", "GLOBAL_ADMIN"],
  RECORD_SO: ["SALES", "STRATEGY", "SCM", "GLOBAL_ADMIN"],
};

export function ActionForm({
  craneId,
  kind,
  label,
  tone = "primary",
  role,
  requireComment = false,
  extra,
  confirmTitle,
  confirmBody,
}: {
  craneId: string;
  kind: string;
  label: string;
  tone?: "primary" | "secondary" | "danger";
  role: string;
  requireComment?: boolean;
  extra?: React.ReactNode;
  confirmTitle?: string;
  confirmBody?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(craneAction, null);
  const [open, setOpen] = useState(false);
  const allowed = ALLOWED[kind]?.includes(role as Role);

  if (!allowed) {
    return (
      <span
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-[11px] font-medium text-faint"
        title={`Your role (${role}) cannot perform this action. It is shown so you can see the workflow.`}
      >
        {label} <span aria-hidden>🔒</span>
      </span>
    );
  }

  const fields = (
    <>
      <input type="hidden" name="craneId" value={craneId} />
      <input type="hidden" name="kind" value={kind} />
      {extra}
      {requireComment && (
        <input
          name="comment"
          required
          placeholder="Decision comment (mandatory)"
          className="input h-9 min-w-[200px] flex-1"
          aria-label="Decision comment"
        />
      )}
    </>
  );

  if (!confirmTitle) {
    return (
      <form action={action} className="flex flex-wrap items-end gap-2">
        {fields}
        <button type="submit" className={`btn btn-${tone} h-9`} disabled={pending}>
          {pending ? "Saving…" : label}
        </button>
        {state?.error && <span className="w-full text-[11px] font-medium text-nd-ink">{state.error}</span>}
        {state?.ok && <span className="w-full text-[11px] font-medium text-healthy-ink" role="status">{state.ok}</span>}
      </form>
    );
  }

  return (
    <>
      <button type="button" className={`btn btn-${tone} h-9`} onClick={() => setOpen(true)}>
        {label}
      </button>
      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-panel p-5 shadow-[var(--shadow-lg)]">
            <AlertDialog.Title className="font-display text-[16px] font-semibold text-ink">
              {confirmTitle}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-[12.5px] leading-relaxed text-muted">
              {confirmBody ?? "This decision is recorded with your name and the time. A comment is mandatory."}
            </AlertDialog.Description>
            <form action={action} className="mt-4 space-y-2">
              {fields}
              {state?.error && <p className="text-[11px] font-medium text-nd-ink">{state.error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <AlertDialog.Cancel asChild>
                  <button type="button" className="btn btn-secondary">Cancel</button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <button type="submit" className={`btn btn-${tone}`} disabled={pending}>
                    {pending ? "Saving…" : `Confirm ${label.toLowerCase()}`}
                  </button>
                </AlertDialog.Action>
              </div>
            </form>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
