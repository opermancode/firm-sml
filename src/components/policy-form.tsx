"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Lock, RotateCcw, Save, XCircle } from "lucide-react";
import { toast } from "sonner";
import { updatePolicy } from "@/app/actions/policy";
import { POLICY_DEFAULTS, type Policy } from "@/lib/policy";
import { ConfirmDialog } from "@/components/confirm-dialog";

const schema = z.object({
  oldFleetYears: z.coerce
    .number({ invalid_type_error: "Enter a number of years." })
    .int("Use whole years.")
    .min(1, "Must be at least 1 year.")
    .max(60, "Must be 60 years or less."),
  repairPct: z.coerce
    .number({ invalid_type_error: "Enter a percentage." })
    .min(0, "Cannot be negative.")
    .max(100, "Cannot exceed 100%."),
  certGraceDays: z.coerce
    .number({ invalid_type_error: "Enter a number of days." })
    .int("Use whole days.")
    .min(0, "Cannot be negative.")
    .max(365, "Must be 365 days or less."),
  nrgUtilPct: z.coerce
    .number({ invalid_type_error: "Enter a percentage." })
    .min(0, "Cannot be negative.")
    .max(100, "Cannot exceed 100%."),
  nrgYieldPct: z.coerce
    .number({ invalid_type_error: "Enter a percentage." })
    .min(0, "Cannot be negative.")
    .max(100, "Cannot exceed 100%."),
  nrgYears: z.coerce
    .number({ invalid_type_error: "Enter a number of years." })
    .int("Use whole years.")
    .min(1, "Must be at least 1 year.")
    .max(10, "Must be 10 years or less."),
  obsoleteScope: z.enum(["old_fleet_only", "all"]),
});

type PolicyValues = z.infer<typeof schema>;

const FIELD_LABELS: Record<keyof PolicyValues, string> = {
  oldFleetYears: "Old Fleet age threshold",
  repairPct: "Repair cost trigger",
  certGraceDays: "Certificate grace period",
  nrgUtilPct: "NRG utilisation threshold",
  nrgYieldPct: "NRG monthly yield threshold",
  nrgYears: "NRG consecutive years",
  obsoleteScope: "Obsolescence trigger scope",
};

const UNITS: Partial<Record<keyof PolicyValues, string>> = {
  oldFleetYears: "years",
  repairPct: "% of capex",
  certGraceDays: "days",
  nrgUtilPct: "%",
  nrgYieldPct: "% / month",
  nrgYears: "years",
};

function display(key: keyof PolicyValues, value: PolicyValues[keyof PolicyValues]) {
  if (key === "obsoleteScope") {
    return value === "all" ? "All equipment" : "Old Fleet only";
  }
  const unit = UNITS[key];
  return unit ? `${value} ${unit}` : String(value);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="field-hint text-nd-ink" role="alert">
      {message}
    </p>
  );
}

export function PolicyForm({ policy, canEdit }: { policy: Policy; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [candidate, setCandidate] = useState<PolicyValues | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<PolicyValues>({
    resolver: zodResolver(schema),
    defaultValues: policy,
  });

  const yieldPct = watch("nrgYieldPct");
  const annualYield = useMemo(() => {
    const value = Number(yieldPct);
    return Number.isFinite(value) ? value * 12 : 0;
  }, [yieldPct]);

  const diff = useMemo(() => {
    if (!candidate) return [];
    return (Object.keys(FIELD_LABELS) as (keyof PolicyValues)[])
      .filter((key) => candidate[key] !== policy[key])
      .map((key) => ({
        key,
        label: FIELD_LABELS[key],
        before: display(key, policy[key]),
        after: display(key, candidate[key]),
      }));
  }, [candidate, policy]);

  function prepare(values: PolicyValues) {
    setServerError(null);
    setCandidate(values);
    setOpen(true);
  }

  function save() {
    if (!candidate) return;
    const formData = new FormData();
    for (const [key, value] of Object.entries(candidate)) {
      formData.set(key, String(value));
    }

    startTransition(async () => {
      const result = await updatePolicy(null, formData);
      if (result?.error) {
        setServerError(result.error);
        toast.error("Policy not saved", { description: result.error });
        return;
      }
      toast.success("Policy saved", {
        description:
          result?.message ??
          "Existing evaluation runs keep their original snapshot. Run a new classification to apply these thresholds.",
      });
      reset(candidate);
      router.refresh();
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit(prepare)} className="space-y-4">
        <section className="card p-4" aria-labelledby="old-fleet-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="old-fleet-title" className="panel-title">
                Old Fleet
              </h2>
              <p className="panel-subtitle mt-0.5">
                Marketability test. A crane older than this from its Year of Manufacture is Old
                Fleet.
              </p>
            </div>
            <span className="badge badge-old">&gt; {policy.oldFleetYears} yrs</span>
          </div>
          <div className="mt-3 max-w-[260px]">
            <label className="label" htmlFor="oldFleetYears">
              Old Fleet age threshold (years)
            </label>
            <input
              id="oldFleetYears"
              type="number"
              min={1}
              max={60}
              step={1}
              className="input"
              disabled={!canEdit}
              aria-invalid={Boolean(errors.oldFleetYears)}
              {...register("oldFleetYears", { valueAsNumber: true })}
            />
            <FieldError message={errors.oldFleetYears?.message} />
          </div>
        </section>

        <section className="card p-4" aria-labelledby="nd-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="nd-title" className="panel-title">
                Non-Deployable
              </h2>
              <p className="panel-subtitle mt-0.5">
                Serviceability test. Model age thresholds (15 / 20 / 25 years) come from the
                approved model master and are not editable here.
              </p>
            </div>
            <span className="badge badge-nd">&gt; {policy.repairPct}% repair</span>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="repairPct">
                Repair cost trigger (% of replacement capex)
              </label>
              <input
                id="repairPct"
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="input"
                disabled={!canEdit}
                aria-invalid={Boolean(errors.repairPct)}
                {...register("repairPct", { valueAsNumber: true })}
              />
              <FieldError message={errors.repairPct?.message} />
              <p className="field-hint">
                A repair estimate above this share of prevailing replacement capex is an
                obsolescence trigger.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="certGraceDays">
                Certificate grace period (days)
              </label>
              <input
                id="certGraceDays"
                type="number"
                min={0}
                max={365}
                step={1}
                className="input"
                disabled={!canEdit}
                aria-invalid={Boolean(errors.certGraceDays)}
                {...register("certGraceDays", { valueAsNumber: true })}
              />
              <FieldError message={errors.certGraceDays?.message} />
              <p className="field-hint">
                A statutory certificate lapsed beyond this many days makes the crane
                Non-Deployable.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="obsoleteScope">
                Obsolescence trigger scope
              </label>
              <select
                id="obsoleteScope"
                className="select"
                disabled={!canEdit}
                {...register("obsoleteScope")}
              >
                <option value="old_fleet_only">
                  Old Fleet only — OEM support, spares, compliance and repair cost
                </option>
                <option value="all">
                  All equipment — apply obsolescence triggers to every crane
                </option>
              </select>
              <p className="field-hint">
                The policy document words these triggers under &ldquo;Any crane in the Old
                Fleet&rdquo;. The default is the literal reading.
              </p>
            </div>
          </div>
        </section>

        <section className="card p-4" aria-labelledby="nrg-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="nrg-title" className="panel-title">
                NRG — Non-Revenue Generating
              </h2>
              <p className="panel-subtitle mt-0.5">
                Condition 1 requires utilisation <em>and</em> monthly yield to stay below both
                thresholds for the full run of consecutive years. Condition 2 is assessed per crane
                from the retention sheet.
              </p>
            </div>
            <span className="badge badge-nrg">&lt; {policy.nrgUtilPct}% util</span>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="nrgUtilPct">
                Utilisation threshold (%)
              </label>
              <input
                id="nrgUtilPct"
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="input"
                disabled={!canEdit}
                aria-invalid={Boolean(errors.nrgUtilPct)}
                {...register("nrgUtilPct", { valueAsNumber: true })}
              />
              <FieldError message={errors.nrgUtilPct?.message} />
            </div>
            <div>
              <label className="label" htmlFor="nrgYieldPct">
                Monthly yield threshold (%)
              </label>
              <input
                id="nrgYieldPct"
                type="number"
                min={0}
                max={100}
                step={0.05}
                className="input"
                disabled={!canEdit}
                aria-invalid={Boolean(errors.nrgYieldPct)}
                {...register("nrgYieldPct", { valueAsNumber: true })}
              />
              <FieldError message={errors.nrgYieldPct?.message} />
            </div>
            <div>
              <label className="label" htmlFor="nrgYears">
                Consecutive years
              </label>
              <input
                id="nrgYears"
                type="number"
                min={1}
                max={10}
                step={1}
                className="input"
                disabled={!canEdit}
                aria-invalid={Boolean(errors.nrgYears)}
                {...register("nrgYears", { valueAsNumber: true })}
              />
              <FieldError message={errors.nrgYears?.message} />
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="rounded-lg border border-line bg-panel-2 px-3 py-2.5 text-[10.5px] leading-relaxed text-muted">
              Monthly yield on capital employed ={" "}
              <span className="mono font-medium text-ink">
                (annual rental revenue ÷ capital employed) ÷ 12 × 100
              </span>
              .
            </div>
            <div className="flex flex-col justify-center rounded-lg border border-line bg-brand-soft px-3 py-2">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-brand-ink">
                Annual yield equivalent
              </span>
              <span className="mono text-[16px] font-semibold text-brand-ink tnum">
                {annualYield.toFixed(2)}%
              </span>
              <span className="text-[9.5px] text-brand-ink/70">
                {Number.isFinite(Number(yieldPct)) ? Number(yieldPct).toFixed(2) : "0.00"}% × 12
              </span>
            </div>
          </div>
        </section>

        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--nd)_30%,transparent)] bg-nd-soft px-4 py-3 text-[12px] text-nd-ink"
          >
            <XCircle size={15} className="mt-0.5 shrink-0" /> {serverError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-[11px] leading-relaxed text-muted">
            {canEdit
              ? "Changes are written to the audit trail. Existing runs keep their policy snapshot."
              : "Only an Administrator can change policy thresholds. Every value is shown read-only."}
          </p>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={pending}
                onClick={() => {
                  reset(POLICY_DEFAULTS);
                  setServerError(null);
                  toast.info("Defaults loaded into the form", {
                    description: "Review the values, then save to apply them.",
                  });
                }}
              >
                <RotateCcw size={13} /> Load defaults
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={!canEdit || pending}>
              {canEdit ? <Save size={14} /> : <Lock size={14} />}
              {pending ? "Saving…" : "Save policy"}
            </button>
          </div>
        </div>
        {canEdit && !isDirty && (
          <p className="text-right text-[10.5px] text-faint">
            No unsaved changes. The form reflects the stored policy.
          </p>
        )}
      </form>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Apply this policy change?"
        description={
          diff.length === 0
            ? "No threshold changed. Saving will still write an audit entry."
            : `This updates ${diff.length} threshold${diff.length === 1 ? "" : "s"}. Existing evaluation runs keep their original policy snapshot; only a new classification uses the new values.`
        }
        confirmLabel={pending ? "Saving…" : "Save policy"}
        tone="primary"
        onConfirm={save}
      >
        {diff.length > 0 ? (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {diff.map((entry) => (
              <li key={entry.key} className="px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-faint">
                  {entry.label}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11.5px]">
                  <span className="text-muted line-through">{entry.before}</span>
                  <span className="text-faint">→</span>
                  <span className="font-semibold text-ink">{entry.after}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-line bg-panel-2 px-3 py-2 text-[11.5px] text-muted">
            <CheckCircle2 size={13} className="text-healthy" /> The submitted values match the stored
            policy.
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
