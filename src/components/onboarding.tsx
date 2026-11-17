"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BadgeCheck, BookOpen, Building2, CalendarRange,
  Check, CircleAlert, ClipboardCheck, FileSpreadsheet, LockKeyhole, ShieldAlert,
  Truck, UsersRound,
} from "lucide-react";
import { completeOnboarding } from "@/app/actions/auth";
import { ROLE_MAP, STATUSES, type Role } from "@/lib/firm/workflow";

const SCREENS = [
  { icon: BookOpen, title: "Dashboard", text: "Where the cycle stands right now: crane counts by status, what is waiting on you, and every active SO date." },
  { icon: Truck, title: "Crane register", text: "The full fleet with one current status per crane. Filter by status, layer, category or type; open a row for the full record." },
  { icon: CalendarRange, title: "Cycles", text: "One upload and everything that follows it. Finance closes a crane when SAP records its exit." },
  { icon: FileSpreadsheet, title: "Upload fleet", text: "FP&A opens the cycle here with the 9-column workbook. Validate first — errors block the commit." },
  { icon: ClipboardCheck, title: "Approvals", text: "The decisions assigned to your role. Approvals and rejections are recorded with your name and time." },
  { icon: UsersRound, title: "Roles & people", text: "The 12 roles from the business document and the account for each one." },
  { icon: ShieldAlert, title: "Rules & settings", text: "The dedup rule, approval matrix, conflict rules and proposed window timings." },
];

const FLOW = [
  ["FP&A uploads", "Crane fields + SO details; age and Old Fleet flag are derived from YOM."],
  ["Sales + Maintenance", "Parallel checks for every crane: marketability / NRG and deployability."],
  ["Finance dedups", "Non-Deployable wins; otherwise Old Fleet beats NRG. One category, one route."],
  ["International first", "Old Fleet and NRG are offered to all BUs. Non-Deployable goes straight to sale."],
  ["Catalogue → sale", "Marketing window, then SCM gathers domestic and international quotations."],
  ["SAP hard stop", "An SO or asset transfer locks the crane. Nobody can claim it back after that."],
];

const STATUS_GROUPS = [
  { label: "Active", codes: "S01, S04, S05, S07, S08, S09, S12, S15", tone: "badge-info", text: "The crane is moving through a layer." },
  { label: "Approval", codes: "S02, S06, S10, S11, S13", tone: "badge-amber", text: "Waiting on a named approver. A reminder comes after 3 working days." },
  { label: "On hold", codes: "S14", tone: "badge-red", text: "Conflict. Everything pauses, the clock stops, decision due in 3 days." },
  { label: "Locked in SAP", codes: "S16, S17, S18, S19", tone: "badge-healthy", text: "Transfer or SO recorded. The crane leaves the cycle." },
  { label: "Closed", codes: "S03, S20", tone: "badge-slate", text: "Not in FIRM, or scrap declined and carried forward." },
];

export function Onboarding({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const meta = ROLE_MAP[role as Role];

  const finish = () => {
    startTransition(async () => {
      await completeOnboarding();
      router.push("/");
      router.refresh();
    });
  };

  const total = 6;
  return (
    <div className="app-canvas min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-[860px]">
        <div className="mb-5 flex items-center gap-3">
          <Image src="/brand/sml-logo.png" alt="Sanghvi Movers Limited" width={44} height={44} className="h-11 w-11 rounded-[10px] object-contain" priority />
          <div>
            <div className="font-display text-[16px] font-semibold tracking-[0.08em] text-ink">FIRM</div>
            <div className="text-[12px] uppercase tracking-[0.16em] text-faint">Fleet exit cycle · Sanghvi Movers Limited</div>
          </div>
          <span className="badge badge-slate ml-auto">Welcome, {name}</span>
        </div>

        <div className="mb-4 flex items-center gap-2">
          {Array.from({ length: total }).map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to guide step ${index + 1}`}
              onClick={() => setStep(index)}
              className={`h-1.5 flex-1 rounded-full transition ${index <= step ? "bg-brand" : "bg-line"}`}
            />
          ))}
        </div>

        <div className="card min-h-[540px] p-6 sm:p-8">
          {step === 0 && (
            <div>
              <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] text-brand">1 of {total} · What FIRM is</div>
              <h1 className="font-display text-[28px] font-semibold tracking-[-0.03em] text-ink">A controlled route out of the fleet.</h1>
              <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">
                FIRM moves Old Fleet, Non-Revenue Generating (NRG) and Non-Deployable cranes to international rental, sale or scrap. Every crane goes through every check, there is one owner per step, and nothing leaves the cycle until SAP records the exit.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Building2, title: "International rental first", text: "Old Fleet and NRG cranes are offered to every international BU before sale." },
                  { icon: BadgeCheck, title: "Governed approvals", text: "Every hand-off is confirmed by one named person and logged." },
                  { icon: LockKeyhole, title: "SAP is the hard stop", text: "An SO or asset transfer locks the crane. After that, no claim-back." },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-line bg-panel-2 p-4">
                    <item.icon size={18} className="text-brand" />
                    <div className="mt-3 text-[12.5px] font-semibold text-ink">{item.title}</div>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-[color-mix(in_srgb,var(--brand)_24%,transparent)] bg-brand-soft px-4 py-3">
                <div className="flex items-start gap-2 text-[12px] leading-relaxed text-brand-ink">
                  <CircleAlert size={15} className="mt-0.5 shrink-0" />
                  <span><strong>On rent?</strong> A crane with a live SO stays in the cycle. Teams can quote and claim it as normal, but a new SO, deployment or handover waits until the current SO ends. That date is shown everywhere as <strong>Execution allowed from</strong>.</span>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] text-brand">2 of {total} · Your role</div>
              <h1 className="font-display text-[28px] font-semibold tracking-[-0.03em] text-ink">You are {meta?.name ?? role}.</h1>
              <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">{meta?.description ?? "You can view the cycle."}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-panel-2 p-4">
                  <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-faint">What you will do</div>
                  <ul className="mt-3 space-y-2 text-[12px] text-muted">
                    <li>· See every crane in the register and its one current status.</li>
                    <li>· Act only on decisions assigned to your role.</li>
                    <li>· Record every decision with a comment — verbal approval moves nothing.</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-line bg-panel-2 p-4">
                  <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-faint">What you cannot do</div>
                  <ul className="mt-3 space-y-2 text-[12px] text-muted">
                    <li>· You cannot change another layer&apos;s decision.</li>
                    <li>· You cannot claim a crane back once SAP has an SO or transfer.</li>
                    <li>· Restricted actions stay visible but locked, with a tooltip explaining why.</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-[12px] text-muted">
                <ShieldAlert size={14} className="text-nd" />
                Every page carries the footer: <strong className="text-ink">Confidential. Sanghvi Movers Limited. Internal use only.</strong>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] text-brand">3 of {total} · The eight steps</div>
              <h1 className="font-display text-[28px] font-semibold tracking-[-0.03em] text-ink">How a crane moves through FIRM.</h1>
              <ol className="mt-6 space-y-3">
                {FLOW.map(([title, text], index) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-bold text-brand-ink">{index + 1}</span>
                    <div>
                      <div className="text-[13px] font-semibold text-ink">{title}</div>
                      <div className="text-[12px] leading-relaxed text-muted">{text}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] text-brand">4 of {total} · The 20 statuses</div>
              <h1 className="font-display text-[28px] font-semibold tracking-[-0.03em] text-ink">One status per crane, always.</h1>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                A status tells you where the crane is, who is responsible, and whether it can still be claimed back. Codes S01 to S20 are grouped into five types.
              </p>
              <div className="mt-6 space-y-2">
                {STATUS_GROUPS.map((group) => (
                  <div key={group.label} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel-2 px-4 py-3">
                    <span className={`badge ${group.tone}`}>{group.label}</span>
                    <span className="font-mono text-[12px] font-semibold text-ink">{group.codes}</span>
                    <span className="text-[12px] text-muted">{group.text}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[12px] text-faint">{STATUSES.length} statuses in total · every crane record shows its code, layer and type.</p>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] text-brand">5 of {total} · The screens</div>
              <h1 className="font-display text-[28px] font-semibold tracking-[-0.03em] text-ink">What is where.</h1>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {SCREENS.map((screen) => (
                  <div key={screen.title} className="flex gap-3 rounded-xl border border-line bg-panel-2 p-3">
                    <screen.icon size={16} className="mt-0.5 shrink-0 text-brand" />
                    <div>
                      <div className="text-[12px] font-semibold text-ink">{screen.title}</div>
                      <div className="text-[12px] leading-relaxed text-muted">{screen.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] text-brand">6 of {total} · Reading a crane</div>
              <h1 className="font-display text-[28px] font-semibold tracking-[-0.03em] text-ink">Everything about one crane, in one place.</h1>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-panel-2 p-4">
                  <div className="text-[12px] font-semibold text-ink">The record shows</div>
                  <ul className="mt-2 space-y-1.5 text-[12px] text-muted">
                    <li>· Status, layer, type and cycle impact</li>
                    <li>· Final category and the three original flags</li>
                    <li>· Sales and Maintenance checks side by side</li>
                    <li>· BU quotes, award, catalogue and sale quotations</li>
                    <li>· Claim-back, conflict, approvals and audit trail</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-line bg-panel-2 p-4">
                  <div className="text-[12px] font-semibold text-ink">The rules to remember</div>
                  <ul className="mt-2 space-y-1.5 text-[12px] text-muted">
                    <li>· Non-Deployable beats Old Fleet, which beats NRG.</li>
                    <li>· Finance can override a category, but only with a written reason; the original flags stay visible.</li>
                    <li>· A conflict pauses everything until CBO, CSO or Strategy decides.</li>
                    <li>· An SO or asset transfer in SAP locks the crane permanently.</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--healthy)_30%,transparent)] bg-healthy-soft px-4 py-3 text-[12px] text-healthy-ink">
                <Check size={15} /> You are ready. You can reopen this guide any time from the Help button in the top bar.
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <button type="button" className="btn btn-ghost" onClick={finish}>Skip for now</button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              {step < total - 1 ? (
                <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>
                  Next <ArrowRight size={14} />
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={finish} disabled={pending}>
                  {pending ? "Opening…" : "Open workspace"} <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
