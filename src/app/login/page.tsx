import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <div className="app-canvas relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[380px] opacity-60"
        style={{
          background:
            "radial-gradient(600px 240px at 50% 0%, color-mix(in srgb, var(--brand) 10%, transparent), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-[420px]">
        <LoginForm />
      </div>

      <div className="relative mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" /> Active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-nrg-review" /> Approval
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-nd" /> On hold / conflict
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-old" /> Locked in SAP
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-healthy" /> Closed
        </span>
      </div>
    </div>
  );
}
