"use client";

import { usePathname } from "next/navigation";
import { CalendarCheck2, ShieldAlert } from "lucide-react";
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { dateLabel } from "@/lib/format";

const SECTION_LABELS: { match: (pathname: string) => boolean; label: string }[] = [
  { match: (p) => p === "/", label: "Dashboard" },
  { match: (p) => p.startsWith("/assets/"), label: "Asset detail" },
  { match: (p) => p.startsWith("/assets"), label: "Fleet Assets" },
  { match: (p) => p.startsWith("/import"), label: "Import Data" },
  { match: (p) => p.startsWith("/runs/"), label: "Evaluation Run" },
  { match: (p) => p.startsWith("/runs"), label: "Evaluation Runs" },
  { match: (p) => p.startsWith("/approvals"), label: "Approvals" },
  { match: (p) => p.startsWith("/models"), label: "Model Master" },
  { match: (p) => p.startsWith("/settings"), label: "Policy Settings" },
];

export function TopBar({
  user,
  approvedDate,
}: {
  user: { name: string; email: string; role: string; designation: string | null };
  approvedDate: string | null;
}) {
  const pathname = usePathname();
  const section = SECTION_LABELS.find((entry) => entry.match(pathname))?.label ?? "Workspace";

  return (
    <div className="no-print sticky top-0 z-20 hidden h-[58px] items-center gap-4 border-b border-line bg-panel/90 px-6 backdrop-blur lg:flex lg:px-8">
      <div className="flex min-w-0 items-center gap-2 text-[12px]">
        <span className="font-semibold text-ink">{section}</span>
        <span className="text-line-strong">/</span>
        <span className="hidden text-faint xl:inline">Fleet classification workspace</span>
        <span className="badge badge-brand ml-1">Policy v1.0</span>
      </div>

      <div className="ml-auto flex flex-1 justify-end">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5"
          title={
            approvedDate
              ? "Evaluation date of the latest approved run"
              : "No approved evaluation run yet"
          }
        >
          <CalendarCheck2 size={13} className="text-brand" />
          <span className="text-[10.5px] font-medium text-muted">
            {approvedDate ? dateLabel(approvedDate) : "No approved run"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--nd)_24%,transparent)] bg-nd-soft px-2 py-1.5">
          <ShieldAlert size={11} className="text-nd-ink" />
          <span className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-nd-ink">
            Confidential
          </span>
        </div>

        <div className="h-5 w-px bg-line" />
        <ThemeToggle />
        <UserMenu
          name={user.name}
          email={user.email}
          designation={user.designation}
          role={user.role}
        />
      </div>
    </div>
  );
}
