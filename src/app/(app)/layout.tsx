import { requireUser } from "@/lib/auth";
import { getApprovalQueue, getCurrentCycle } from "@/lib/firm/api";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [cycle, queue] = await Promise.all([
    getCurrentCycle(),
    getApprovalQueue(user.role),
  ]);

  const shellUser = {
    name: user.name,
    email: user.email,
    role: user.role,
    designation: user.designation,
  };

  return (
    <div className="app-canvas min-h-screen">
      <Sidebar user={shellUser} pendingApprovals={queue.length} />
      <div className="lg:pl-[252px]">
        <TopBar user={shellUser} cycle={cycle} />
        <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </main>
        <footer className="mx-auto flex max-w-[1480px] flex-col items-start justify-between gap-2 border-t border-line px-4 py-5 text-[10.5px] text-faint sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <span className="flex items-center gap-1.5">
            <ShieldAlert size={11} className="text-nd" />
            <strong className="font-semibold text-muted">
              Confidential. Sanghvi Movers Limited. Internal use only.
            </strong>
          </span>
          <span>FIRM · Fleet exit cycle · Sanghvi Movers Limited</span>
        </footer>
      </div>
    </div>
  );
}
