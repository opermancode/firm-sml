"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Send, Sparkles, X } from "lucide-react";
import type { Crane } from "@/lib/firm/types";
import { dateLabel } from "@/lib/format";
import {
  CATEGORY_LABEL,
  CONFLICT_RULES,
  ROLE_MAP,
  STATUS_MAP,
  type Role,
  type StatusCode,
} from "@/lib/firm/workflow";

const LAST_VISIT_KEY = "firm-last-visit";

const DISCLAIMER =
  "Assistive only — FIRM reads and explains. It never approves, rejects or edits any record.";

/** Example prompts, with the first example personalised to a real asset. */
function examples(cranes: Crane[]): string[] {
  const first = cranes[0]?.equipmentId ?? "an asset";
  return [
    `Why is ${first} stuck?`,
    "Which cranes can be claimed back?",
    "What is waiting on me?",
    "Show conflicts",
    "Which SOs are ending?",
    "Explain S14",
  ];
}

interface Source {
  label: string;
  href?: string;
}

interface Answer {
  lead: string;
  lines: ReactNode[];
  sources: Source[];
  chips?: string[];
}

/** Approval statuses and the roles that own each decision (Section 7). */
const APPROVAL_OWNERS: Record<string, { roles: string[]; decision: string }> = {
  S02: { roles: ["FINANCE"], decision: "Finalise FIRM list after deduplication" },
  S06: { roles: ["STRATEGY", "CSO"], decision: "Award crane to an international BU" },
  S10: { roles: ["CBO", "MD", "CEO"], decision: "Approve sale" },
  S11: { roles: ["MD", "CBO"], decision: "Approve scrap sale" },
  S13: { roles: ["CBO", "CSO", "SALES", "STRATEGY"], decision: "Approve claim-back" },
  S14: { roles: ["CBO", "CSO", "STRATEGY", "MD"], decision: "Resolve conflict" },
};

function roleName(role: string): string {
  return ROLE_MAP[role as Role]?.name ?? role;
}

function craneLink(crane: Crane): ReactNode {
  return (
    <Link
      href={`/cranes/${crane.id}`}
      className="font-semibold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {crane.equipmentId}
    </Link>
  );
}

function findCrane(question: string, cranes: Crane[]): Crane | undefined {
  const q = question.toLowerCase();
  return cranes.find(
    (crane) =>
      q.includes(crane.equipmentId.toLowerCase()) || q.includes(crane.id.toLowerCase()),
  );
}

function sourceForCrane(crane: Crane): Source {
  return { label: crane.equipmentId, href: `/cranes/${crane.id}` };
}

/** Deterministic, rule-based answers. No network, no mutations. */
function answerQuestion(question: string, cranes: Crane[], role: string, userName: string): Answer {
  const q = question.trim().toLowerCase();

  // 1. Why is <asset> stuck?
  if (/\bwhy\b/.test(q)) {
    const crane = findCrane(question, cranes);
    if (!crane) {
      return {
        lead: "I couldn't match that to an asset in the current cycle.",
        lines: [
          <>Include the equipment ID or record ID, for example <strong className="text-ink">Why is {cranes[0]?.equipmentId ?? "an asset"} stuck?</strong></>,
        ],
        sources: [{ label: "Crane register", href: "/cranes" }],
        chips: examples(cranes).slice(0, 3),
      };
    }

    const meta = STATUS_MAP[crane.status];
    const lines: ReactNode[] = [
      <>
        It sits at <strong className="text-ink tnum">{meta.code} · {meta.name}</strong> — layer{" "}
        <strong className="text-ink">{meta.layer}</strong>, type{" "}
        <strong className="text-ink">{meta.type}</strong>, cycle impact{" "}
        <strong className="text-ink">{meta.impact}</strong>.
      </>,
      <>Why it is held: {meta.hint}</>,
    ];

    if (meta.type === "Approval") {
      const owner = APPROVAL_OWNERS[crane.status];
      const lastApproval = crane.approvals[crane.approvals.length - 1];
      const waiting = owner
        ? `${owner.roles.map(roleName).join(" or ")} — ${owner.decision}`
        : "the assigned approver";
      lines.push(
        <>
          Waiting on <strong className="text-ink">{waiting}</strong>
          {lastApproval ? ` (last logged by ${lastApproval.approverName})` : ""}.
        </>,
      );
    }

    if (crane.sap.soEnd) {
      lines.push(
        <>
          A live SO is recorded. No new SO, deployment or handover before{" "}
          <strong className="text-ink tnum">execution allowed from {dateLabel(crane.sap.soEnd)}</strong>.
        </>,
      );
    }

    if (crane.finalCategory) {
      lines.push(<>Final category: <strong className="text-ink">{CATEGORY_LABEL[crane.finalCategory]}</strong>.</>);
    }

    return {
      lead: `${crane.equipmentId} is at ${meta.code} — ${meta.name}.`,
      lines,
      sources: [
        sourceForCrane(crane),
        { label: "Section 6 claim-back" },
        { label: "Section 7 approvals" },
      ],
    };
  }

  // 2. Which cranes can be claimed back?
  if (q.includes("claim") && (q.includes("back") || q.includes("able"))) {
    const claimable = cranes.filter(
      (crane) => STATUS_MAP[crane.status].type !== "Locked" && crane.status !== "S03",
    );
    const shown = claimable.slice(0, 6);
    return {
      lead: `${claimable.length} crane${claimable.length === 1 ? "" : "s"} can still be claimed back — SAP has not locked them.`,
      lines: shown.length
        ? shown.map((crane) => (
            <>
              {craneLink(crane)} — {STATUS_MAP[crane.status].name}{" "}
              <span className="tnum text-faint">({crane.status})</span>
            </>
          ))
        : [<>No crane is eligible right now.</>],
      sources: [
        { label: "SO hard stop rule" },
        { label: "Section 6 claim-back" },
        ...shown.map(sourceForCrane),
      ],
    };
  }

  // 3. What is waiting on me? / my queue
  if (q.includes("waiting on me") || q.includes("my queue") || q.includes("on my plate")) {
    const mine = cranes.filter((crane) => APPROVAL_OWNERS[crane.status]?.roles.includes(role));
    return {
      lead: mine.length
        ? `${userName}, ${mine.length} decision${mine.length === 1 ? "" : "s"} are waiting on you (${roleName(role)}).`
        : `${userName}, nothing is waiting on you right now (${roleName(role)}).`,
      lines: mine.length
        ? mine.map((crane) => {
            const owner = APPROVAL_OWNERS[crane.status];
            return (
              <>
                {craneLink(crane)} — {owner.decision}. Owner:{" "}
                <strong className="text-ink">{roleName(role)}</strong>{" "}
                <span className="tnum text-faint">({crane.status})</span>.
              </>
            );
          })
        : [<>Approval statuses are S02, S06, S10, S11, S13 and S14; none currently name your role.</>],
      sources: [
        { label: "Statuses S02 · S06 · S10 · S11 · S13 · S14" },
        { label: "Section 7 approvals" },
        ...mine.slice(0, 4).map(sourceForCrane),
      ],
    };
  }

  // 4. Conflicts
  if (q.includes("conflict")) {
    const conflicts = cranes.filter((crane) => crane.status === "S14");
    return {
      lead: conflicts.length
        ? `${conflicts.length} crane${conflicts.length === 1 ? "" : "s"} in S14 — everything is paused until the decision is made.`
        : "There are no open conflicts (S14) in the current cycle.",
      lines: conflicts.length
        ? conflicts.map((crane) => {
            const rule = CONFLICT_RULES.find((entry) => entry.id === crane.conflict?.ruleId);
            const title = crane.conflict?.title ?? rule?.title ?? "Conflict — decision pending";
            const decidedBy = rule?.decidedBy ?? crane.conflict?.decidedBy ?? "Named approver";
            return (
              <>
                {craneLink(crane)} — {title}. Decided by{" "}
                <strong className="text-ink">{decidedBy}</strong>.
              </>
            );
          })
        : [<>Conflicts arise when a sale quotation competes with a rental claim and move a crane to S14.</>],
      sources: [
        { label: "Section 6 conflict rules" },
        ...conflicts.map(sourceForCrane),
      ],
    };
  }

  // 5. SO ending / execution
  if (q.includes("execution") || q.includes("so end") || q.includes("so ending")) {
    const withSo = cranes
      .filter((crane) => Boolean(crane.sap.soEnd))
      .sort((a, b) => (a.sap.soEnd ?? "").localeCompare(b.sap.soEnd ?? ""));
    return {
      lead: withSo.length
        ? `${withSo.length} active SO${withSo.length === 1 ? "" : "s"}, earliest execution date first.`
        : "No crane has an SO end date recorded in this cycle.",
      lines: withSo.length
        ? withSo.map((crane) => (
            <>
              {craneLink(crane)} — execution allowed from{" "}
              <strong className="text-ink tnum">{dateLabel(crane.sap.soEnd)}</strong>
              {crane.sap.soNumber ? <> · SO <span className="tnum">{crane.sap.soNumber}</span></> : null}
            </>
          ))
        : [<>Upload SO End Dates to see the “Execution allowed from” rule in action.</>],
      sources: [
        { label: "Execution allowed from rule" },
        { label: "Section 1 — no new SO before the current SO ends" },
      ],
    };
  }

  // 6. Explain S01–S20
  const code = q.match(/\b(s0[1-9]|s1[0-9]|s20)\b/)?.[1]?.toUpperCase() as StatusCode | undefined;
  if (code && STATUS_MAP[code]) {
    const meta = STATUS_MAP[code];
    return {
      lead: `${meta.code} — ${meta.name}.`,
      lines: [
        <>Layer <strong className="text-ink">{meta.layer}</strong> · type{" "}
          <strong className="text-ink">{meta.type}</strong> · cycle impact{" "}
          <strong className="text-ink">{meta.impact}</strong>.</>,
        <>{meta.hint}</>,
      ],
      sources: [{ label: "Section 12.1 — the 20 statuses" }],
    };
  }

  // 7. Fallback
  return {
    lead: "Ask me about a crane or a rule. I answer from the current cycle data only.",
    lines: [],
    sources: [{ label: "Section 12.1 — the 20 statuses" }, { label: "Section 7 approvals" }],
    chips: examples(cranes),
  };
}

interface Exchange {
  question: string;
  answer: Answer;
}

export function AiCopilot({
  cranes,
  role,
  userName,
}: {
  cranes: Crane[];
  role: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);
  const [digest, setDigest] = useState<{ count: number; firstVisit: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const visitRecorded = useRef(false);

  // Global Cmd/Ctrl+J toggle (and Escape to close).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // "Since you last visited" digest — computed off the render path, never blocking.
  useEffect(() => {
    if (!open || visitRecorded.current) return;
    visitRecorded.current = true;

    let last: string | null = null;
    try {
      last = window.localStorage.getItem(LAST_VISIT_KEY);
    } catch {
      last = null;
    }

    const afterMs = last ? Date.parse(last) : NaN;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let count = 0;
    for (const crane of cranes) {
      for (const event of crane.audit) {
        const at = Date.parse(event.at);
        if (Number.isNaN(at)) continue;
        if (Number.isNaN(afterMs) ? at >= startOfToday.getTime() : at > afterMs) count += 1;
      }
    }
    setDigest({ count, firstVisit: !last });

    try {
      window.localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    } catch {
      /* storage unavailable — the digest still renders */
    }
  }, [open, cranes]);

  // Focus the input and keep the newest answer in view.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (answerRef.current) answerRef.current.scrollTop = answerRef.current.scrollHeight;
  }, [history]);

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setHistory((prev) => [
      ...prev,
      { question: trimmed, answer: answerQuestion(trimmed, cranes, role, userName) },
    ]);
    setInput("");
    inputRef.current?.focus();
  }

  const introChips = examples(cranes);

  return (
    <>
      {/* Motion is a progressive enhancement; reduced-motion users get none (CSS only). */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .firm-copilot *, .firm-copilot *::before, .firm-copilot *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <div className="firm-copilot">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            title="Ask FIRM (⌘/Ctrl + J)"
            aria-label="Open Ask FIRM assistant"
            className="btn btn-primary fixed bottom-5 right-5 z-50 gap-2 rounded-full px-4 shadow-[var(--shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Sparkles size={16} />
            <span className="text-[13px]">Ask FIRM</span>
          </button>
        ) : (
          <section
            aria-label="Ask FIRM assistant"
            className="card fixed bottom-5 right-5 z-50 flex h-[480px] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden shadow-[var(--shadow-lg)]"
          >
            {/* Header */}
            <header className="flex items-start gap-2.5 border-b border-line bg-panel-2 px-4 py-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Sparkles size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[14px] font-semibold tracking-[-0.01em] text-ink">
                  Ask FIRM
                </h2>
                <p className="text-[12px] leading-snug text-muted">
                  Assistive only — reads and explains, never changes records.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Ask FIRM assistant"
                className="rounded-lg p-1.5 text-muted transition hover:bg-panel-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X size={16} />
              </button>
            </header>

            {/* Since you last visited digest */}
            <div className="border-b border-line px-4 py-2">
              {digest ? (
                <span className="badge badge-slate text-[12px]">
                  {digest.firstVisit ? (
                    <>First visit — showing today&apos;s activity · <span className="tnum">{digest.count}</span> event{digest.count === 1 ? "" : "s"} today</>
                  ) : (
                    <><span className="tnum">{digest.count}</span> new event{digest.count === 1 ? "" : "s"} since your last visit</>
                  )}
                </span>
              ) : (
                <span className="text-[12px] text-faint">Checking your recent activity…</span>
              )}
            </div>

            {/* Answer area */}
            <div
              ref={answerRef}
              aria-live="polite"
              aria-atomic="false"
              className="scroll-thin flex-1 space-y-4 overflow-y-auto px-4 py-3"
            >
              {history.length === 0 && (
                <div>
                  <p className="text-[13px] font-semibold text-ink">
                    Hello {userName}. What would you like to understand?
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">
                    Pick a question or type one below. Answers come from the current cycle and never change a record.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {introChips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => ask(chip)}
                        className="rounded-full border border-line bg-panel-2 px-2.5 py-1 text-[12px] text-brand-ink transition hover:border-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {history.map((exchange, index) => (
                <div key={index} className="space-y-2">
                  <p className="rounded-lg bg-brand-soft px-2.5 py-1.5 text-[12.5px] font-semibold text-brand-ink">
                    {exchange.question}
                  </p>
                  <div className="rounded-lg border border-line bg-panel-2 px-3 py-2.5">
                    <p className="text-[13px] font-semibold leading-snug text-ink">{exchange.answer.lead}</p>
                    {exchange.answer.lines.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {exchange.answer.lines.map((line, i) => (
                          <div key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-muted">
                            <span aria-hidden="true" className="mt-0.5 text-faint">•</span>
                            <span>{line}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 border-t border-line pt-2">
                      <div className="text-[12px] font-semibold text-ink">Sources</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {exchange.answer.sources.map((source, i) =>
                          source.href ? (
                            <Link
                              key={i}
                              href={source.href}
                              className="badge badge-brand text-[12px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              {source.label}
                            </Link>
                          ) : (
                            <span key={i} className="badge badge-slate text-[12px]">
                              {source.label}
                            </span>
                          ),
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-[12px] italic leading-snug text-faint">{DISCLAIMER}</p>

                    {exchange.answer.chips && exchange.answer.chips.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {exchange.answer.chips.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => ask(chip)}
                            className="rounded-full border border-line bg-panel px-2.5 py-1 text-[12px] text-brand-ink transition hover:border-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Composer */}
            <form
              className="flex items-center gap-2 border-t border-line bg-panel-2 px-3 py-2.5"
              onSubmit={(event) => {
                event.preventDefault();
                ask(input);
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="input h-9 text-[12.5px]"
                placeholder="Ask about a crane or a rule…"
                aria-label="Ask FIRM a question"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send question"
                className="btn btn-primary btn-icon h-9 w-9 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Send size={15} />
              </button>
            </form>
          </section>
        )}
      </div>
    </>
  );
}
