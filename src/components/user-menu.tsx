"use client";

import { useRef } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { initials } from "@/lib/format";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  PREPARER: "Preparer",
  REVIEWER: "Reviewer",
  APPROVER: "Approver",
};

export function UserMenu({
  name,
  email,
  designation,
  role,
}: {
  name: string;
  email: string;
  designation: string | null;
  role: string;
}) {
  const logoutForm = useRef<HTMLFormElement>(null);

  return (
    <>
      {/*
        The sign-out form lives outside the menu on purpose. Radix menu items
        cancel the default action of whatever they wrap, which stopped a nested
        submit button from posting. The item below submits this form directly.
      */}
      <form ref={logoutForm} action={logoutAction} className="hidden" aria-hidden />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-transparent px-1.5 py-1 transition hover:border-line hover:bg-panel-2"
            aria-label="Account menu"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
              {initials(name)}
            </span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-[130px] truncate text-[12px] font-semibold leading-tight text-ink">
                {name}
              </span>
              <span className="block text-[10px] leading-tight text-faint">
                {ROLE_LABEL[role] ?? role}
              </span>
            </span>
            <ChevronDown size={13} className="hidden text-faint sm:block" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 w-[248px] overflow-hidden rounded-xl border border-line bg-panel p-1 shadow-[var(--shadow-lg)]"
          >
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-ink">
                  {initials(name)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-semibold text-ink">{name}</div>
                  <div className="truncate text-[10.5px] text-muted">{designation ?? email}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="badge badge-brand">
                  <ShieldCheck size={10} /> {ROLE_LABEL[role] ?? role}
                </span>
                <span className="text-[10px] text-faint">12-hour session</span>
              </div>
            </div>
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item
              className="flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-muted outline-none data-[highlighted]:bg-panel-2 data-[highlighted]:text-ink"
              onSelect={() => {
                window.location.href = `/assets?q=${encodeURIComponent(email)}`;
              }}
            >
              <UserRound size={13} /> Account &amp; directory
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-muted outline-none data-[highlighted]:bg-panel-2 data-[highlighted]:text-ink"
              onSelect={() => {
                window.location.href = "/settings";
              }}
            >
              <ShieldCheck size={13} /> Access &amp; policy
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item
              className="flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-nd-ink outline-none data-[highlighted]:bg-nd-soft"
              onSelect={(event) => {
                event.preventDefault();
                logoutForm.current?.requestSubmit();
              }}
            >
              <LogOut size={13} /> Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
