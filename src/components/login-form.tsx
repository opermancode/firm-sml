"use client";

import { useActionState, useState } from "react";
import { ChevronDown, Clock3, LockKeyhole, Mail, ShieldAlert } from "lucide-react";
import { loginAction, type LoginState } from "@/app/actions/auth";

const DEMO_ACCOUNTS = [
  {
    name: "System Administrator",
    role: "ADMIN",
    email: "admin@firm.local",
    password: "Admin@12345",
  },
  {
    name: "Satish Irale",
    role: "PREPARER",
    designation: "AVP – SCM",
    email: "satish.irale@firm.local",
    password: "Firm@12345",
  },
  {
    name: "Prajwal Kumar",
    role: "REVIEWER",
    designation: "CBO",
    email: "prajwal.kumar@firm.local",
    password: "Firm@12345",
  },
  {
    name: "Abhijeet Sawarkar",
    role: "REVIEWER",
    designation: "VP",
    email: "abhijeet.sawarkar@firm.local",
    password: "Firm@12345",
  },
  {
    name: "R. Manoj",
    role: "REVIEWER",
    designation: "VP",
    email: "r.manoj@firm.local",
    password: "Firm@12345",
  },
  {
    name: "Gaurang Desai",
    role: "APPROVER",
    designation: "CEO",
    email: "gaurang.desai@firm.local",
    password: "Firm@12345",
  },
  {
    name: "Rishi Sanghvi",
    role: "APPROVER",
    designation: "MD",
    email: "rishi.sanghvi@firm.local",
    password: "Firm@12345",
  },
];

const ROLE_TONE: Record<string, string> = {
  ADMIN: "badge-brand",
  PREPARER: "badge-info",
  REVIEWER: "badge-amber",
  APPROVER: "badge-healthy",
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);
  const [email, setEmail] = useState("admin@firm.local");
  const [password, setPassword] = useState("Admin@12345");
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="w-full max-w-[420px]">
      <div className="mb-6 flex items-center gap-3">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-[18px] font-bold text-white shadow-sm">
          <span className="font-display">F</span>
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-nd ring-2 ring-canvas" />
        </span>
        <div>
          <div className="font-display text-[17px] font-semibold tracking-[0.08em] text-ink">
            FIRM
          </div>
          <div className="text-[9.5px] uppercase tracking-[0.18em] text-faint">
            Fleet Inventory &amp; Retention Management
          </div>
        </div>
      </div>

      <div className="card p-6 sm:p-7">
        <h1 className="font-display text-[23px] font-semibold tracking-[-0.02em] text-ink">
          Sign in
        </h1>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          Use your FIRM account to access the fleet classification workspace.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email address
            </label>
            <div className="relative">
              <Mail
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input h-10 pl-9"
                placeholder="name@firm.local"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <LockKeyhole
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input h-10 pl-9"
                placeholder="••••••••"
              />
            </div>
          </div>

          {state?.error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--nd)_30%,transparent)] bg-nd-soft px-3 py-2 text-[12px] font-medium text-nd-ink"
            >
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              {state.error}
            </div>
          )}

          <button type="submit" className="btn btn-primary h-10 w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>

          <p className="flex items-center gap-1.5 text-[11px] text-faint">
            <Clock3 size={12} /> Session lasts 12 hours. You will be asked to sign in again after
            it expires.
          </p>
        </form>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-panel">
        <button
          type="button"
          onClick={() => setDemoOpen((open) => !open)}
          aria-expanded={demoOpen}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <span>
            <span className="block text-[12px] font-semibold text-ink">
              Demo accounts
            </span>
            <span className="block text-[10.5px] text-faint">
              Seeded for evaluation · click an account to fill the form
            </span>
          </span>
          <ChevronDown
            size={15}
            className={`shrink-0 text-faint transition-transform ${demoOpen ? "rotate-180" : ""}`}
          />
        </button>

        {demoOpen && (
          <div className="border-t border-line p-2">
            <ul className="max-h-[280px] space-y-1 overflow-y-auto scroll-thin">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-panel-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[11.5px] font-medium text-ink">
                        {account.name}
                        {account.designation ? (
                          <span className="text-faint"> · {account.designation}</span>
                        ) : null}
                      </span>
                      <span className="block truncate text-[10px] text-faint">{account.email}</span>
                    </span>
                    <span className={`badge ${ROLE_TONE[account.role] ?? "badge-slate"}`}>
                      {account.role}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="px-2.5 pb-1 pt-2 text-[10px] leading-relaxed text-faint">
              Change passwords and set <span className="font-mono">SESSION_SECRET</span> before any
              shared deployment.
            </p>
          </div>
        )}
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-faint">
        <ShieldAlert size={11} className="text-nd" />
        Confidential. Sanghvi Movers Limited. Internal use only.
      </p>
    </div>
  );
}
