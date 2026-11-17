"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BadgeCheck,
  BookOpen,
  CalendarRange,
  LayoutDashboard,
  Menu,
  ShieldAlert,
  SlidersHorizontal,
  Truck,
  UploadCloud,
  UsersRound,
  X,
} from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_MAP, type Role } from "@/lib/firm/workflow";

export interface SidebarUser {
  name: string;
  email: string;
  role: string;
  designation: string | null;
}

const NAV: {
  label: string;
  items: { href: string; label: string; icon: typeof LayoutDashboard; badge?: boolean }[];
}[] = [
  { label: "Overview", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "FIRM cycle",
    items: [
      { href: "/cranes", label: "Crane register", icon: Truck },
      { href: "/cycles", label: "Cycles", icon: CalendarRange },
      { href: "/import", label: "Upload fleet", icon: UploadCloud },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/approvals", label: "Approvals", icon: BadgeCheck, badge: true },
      { href: "/roles", label: "Roles & people", icon: UsersRound },
    ],
  },
  {
    label: "System",
    items: [{ href: "/settings", label: "Rules & settings", icon: SlidersHorizontal }],
  },
];

function NavLinks({
  pendingApprovals,
  onNavigate,
}: {
  pendingApprovals: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="space-y-5" aria-label="Primary">
      {NAV.map((group) => (
        <div key={group.label}>
          <div className="sidebar-group">{group.label}</div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`sidebar-link ${active ? "active" : ""}`}
                >
                  <Icon size={16} strokeWidth={1.9} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && pendingApprovals > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-nd px-1 text-[9.5px] font-bold text-white">
                      {pendingApprovals}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-1" aria-label="FIRM home">
      <Image
        src="/brand/sml-logo.png"
        alt="Sanghvi Movers Limited"
        width={38}
        height={38}
        className="h-[38px] w-[38px] shrink-0 rounded-[8px] object-contain"
        priority
      />
      <span>
        <span
          className={`block font-display font-semibold tracking-[0.06em] text-ink ${
            compact ? "text-[13px]" : "text-[15px]"
          }`}
        >
          FIRM
        </span>
        <span className="block text-[9px] uppercase tracking-[0.16em] text-faint">
          Fleet exit cycle
        </span>
      </span>
    </Link>
  );
}

function ConfidentialTag() {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-[color-mix(in_srgb,var(--nd)_26%,transparent)] bg-nd-soft px-2 py-1">
      <ShieldAlert size={11} className="text-nd-ink" />
      <span className="text-[8.5px] font-bold uppercase tracking-[0.13em] text-nd-ink">
        Confidential
      </span>
    </div>
  );
}

export function Sidebar({
  user,
  pendingApprovals,
}: {
  user: SidebarUser;
  pendingApprovals: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = ROLE_MAP[user.role as Role];

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-line bg-panel px-3 py-5 lg:flex">
        <Brand />
        <div className="mt-3 px-1">
          <ConfidentialTag />
        </div>
        <div className="mt-5 flex-1 overflow-y-auto scroll-thin px-1.5">
          <NavLinks pendingApprovals={pendingApprovals} />
        </div>
        <div className="mt-4 space-y-3 px-1.5">
          <div className="rounded-lg border border-line bg-panel-2 px-2.5 py-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                {user.name.split(/\s+/).filter(Boolean).slice(0, 2)
                  .map((part) => part[0]?.toUpperCase()).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-semibold text-ink">{user.name}</div>
                <div className="truncate text-[10px] text-muted">
                  {user.designation ?? role?.short ?? user.role}
                </div>
              </div>
              <span className="badge badge-slate">{role?.short ?? user.role}</span>
            </div>
          </div>
          <Link href="/welcome" className="sidebar-link">
            <BookOpen size={15} /> Guide &amp; help
          </Link>
          <div className="px-1 text-[9px] leading-relaxed text-faint">
            Sanghvi Movers Limited
            <br />
            FIRM cycle · Internal use only
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-panel/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Brand compact />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger asChild>
              <button type="button" className="btn btn-secondary btn-icon" aria-label="Open navigation menu">
                <Menu size={17} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
              <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col border-r border-line bg-panel px-4 py-5 shadow-[var(--shadow-lg)]">
                <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                <div className="flex items-center justify-between">
                  <Brand />
                  <Dialog.Close asChild>
                    <button type="button" className="btn btn-ghost btn-icon" aria-label="Close navigation menu">
                      <X size={17} />
                    </button>
                  </Dialog.Close>
                </div>
                <div className="mt-3"><ConfidentialTag /></div>
                <div className="mt-5 flex-1 overflow-y-auto">
                  <NavLinks pendingApprovals={pendingApprovals} onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="mt-4 rounded-lg border border-line bg-panel-2 px-3 py-2.5">
                  <div className="truncate text-[12px] font-semibold text-ink">{user.name}</div>
                  <div className="truncate text-[10.5px] text-muted">
                    {user.designation ?? role?.short ?? user.role}
                  </div>
                  <div className="mt-1.5">
                    <span className="badge badge-brand">{role?.short ?? user.role}</span>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <UserMenu name={user.name} email={user.email} designation={user.designation} role={user.role} />
        </div>
      </header>
    </>
  );
}
