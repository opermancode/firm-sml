import Link from "next/link";
import { History, Info, ShieldCheck, Users } from "lucide-react";
import { getPolicy, getUsers } from "@/lib/api";
import { POLICY_DEFAULTS } from "@/lib/policy";
import { hasRole, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { PolicyForm } from "@/components/policy-form";
import { ReclassifyButton } from "@/components/reclassify-button";
import { RoleGate } from "@/components/role-gate";

export const dynamic = "force-dynamic";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: "Full access, including policy changes and override of the sign-off chain.",
  PREPARER: "Imports fleet data and prepares the evaluation run for review.",
  REVIEWER: "Reviews the classification and forwards it for approval, or returns it for rework.",
  APPROVER: "Final management approval of the fleet classification.",
};

const ROLE_TONE: Record<string, string> = {
  ADMIN: "badge-brand",
  PREPARER: "badge-info",
  REVIEWER: "badge-amber",
  APPROVER: "badge-healthy",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const [policy, users] = await Promise.all([getPolicy(), getUsers()]);

  const canEdit = user.role === "ADMIN";
  const canRun = hasRole(user, "PREPARER");

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Policy settings"
        description="Every classification threshold is stored in the database, so a policy revision does not need a code change. Existing evaluation runs keep the snapshot they were computed with."
        actions={
          <Link href="/models" className="btn btn-secondary">
            Model master
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <PolicyForm policy={policy} canEdit={canEdit} />

        <div className="space-y-4">
          <section className="card p-4" aria-labelledby="access-title">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-brand" />
              <h2 id="access-title" className="panel-title">
                Your access
              </h2>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-line bg-panel-2 px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-ink">{user.name}</div>
                <div className="truncate text-[10.5px] text-muted">
                  {user.designation ?? user.email}
                </div>
              </div>
              <span className={`badge ${ROLE_TONE[user.role] ?? "badge-slate"}`}>{user.role}</span>
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
              {ROLE_DESCRIPTIONS[user.role] ?? "Standard access."}
            </p>
            {!canEdit && (
              <p className="mt-2 rounded-lg border border-line bg-panel-2 px-2.5 py-2 text-[10.5px] leading-relaxed text-faint">
                Policy thresholds are read-only for your role. Ask an Administrator to make a
                change.
              </p>
            )}

            {canRun ? (
              <div className="mt-4 border-t border-line pt-4">
                <div className="mb-1.5 text-[11.5px] font-semibold text-ink">
                  Re-run the classification
                </div>
                <p className="mb-2.5 text-[10.5px] leading-relaxed text-muted">
                  Applies the saved policy to the current fleet data and creates a new run for
                  sign-off. Useful after a threshold change.
                </p>
                <ReclassifyButton />
              </div>
            ) : (
              <div className="mt-4 border-t border-line pt-4">
                <div className="mb-1.5 text-[11.5px] font-semibold text-ink">
                  Re-run the classification
                </div>
                <p className="mb-2.5 text-[10.5px] leading-relaxed text-muted">
                  Creates a new evaluation run for sign-off after a policy or data change.
                </p>
                <RoleGate
                  role={user.role}
                  allow={["PREPARER"]}
                  mode="disable"
                  reason="Only a Preparer or Administrator can run a new classification. Ask a preparer to re-run it."
                >
                  <span className="btn btn-secondary">Reclassify current fleet</span>
                </RoleGate>
              </div>
            )}
          </section>

          <section className="card p-4" aria-labelledby="defaults-title">
            <div className="flex items-center gap-2">
              <History size={15} className="text-faint" />
              <h2 id="defaults-title" className="panel-title">
                Policy defaults
              </h2>
            </div>
            <dl className="mt-3 space-y-2 text-[11.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Old Fleet age</dt>
                <dd className="font-medium text-ink">&gt; {POLICY_DEFAULTS.oldFleetYears} yrs</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">NRG utilisation</dt>
                <dd className="font-medium text-ink">&lt; {POLICY_DEFAULTS.nrgUtilPct}%</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">NRG monthly yield</dt>
                <dd className="font-medium text-ink">&lt; {POLICY_DEFAULTS.nrgYieldPct}%</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Consecutive years</dt>
                <dd className="font-medium text-ink">{POLICY_DEFAULTS.nrgYears}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Repair cost trigger</dt>
                <dd className="font-medium text-ink">&gt; {POLICY_DEFAULTS.repairPct}%</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Certificate grace</dt>
                <dd className="font-medium text-ink">{POLICY_DEFAULTS.certGraceDays} days</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Obsolescence scope</dt>
                <dd className="font-medium text-ink">Old Fleet only</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-line bg-panel-2 px-3 py-2 text-[10.5px] leading-relaxed text-faint">
              <Info size={12} className="mt-0.5 shrink-0" />
              <span>
                Defaults mirror the FIRM definition document. Changing a value affects only new
                evaluation runs.
              </span>
            </div>
          </section>

          <section className="card overflow-hidden" aria-labelledby="users-title">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Users size={15} className="text-faint" />
              <div>
                <h2 id="users-title" className="panel-title">
                  Users &amp; roles
                </h2>
                <p className="panel-subtitle mt-0.5">
                  {users.length} accounts seeded for evaluation
                </p>
              </div>
            </div>
            <div className="divide-y divide-line">
              {users.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between gap-2 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-ink">{account.name}</div>
                    <div className="truncate text-[10.5px] text-muted">
                      {account.designation ?? account.email}
                    </div>
                  </div>
                  <span className={`badge ${ROLE_TONE[account.role] ?? "badge-slate"}`}>
                    {account.role}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-2.5 text-[10.5px] text-faint">
              Seeded credentials are for evaluation only.{" "}
              <Link href="/runs" className="font-medium text-brand">
                View evaluation runs →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
