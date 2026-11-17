import { Eye, ShieldCheck, UsersRound } from "lucide-react";
import { ROLE_MAP, type Role } from "@/lib/firm/workflow";

const READ_ONLY = new Set(["BU", "MARKETING", "SCM", "FPNA"]);

const ROLE_NOTE: Record<string, string> = {
  GLOBAL_ADMIN: "You can see every queue and push stuck cranes forward, but you do not take business decisions.",
  FPNA: "You open the cycle with the fleet upload and validate sale prices before management approval.",
  SALES: "Your queue is the S01 sales check and claim-backs. You can claim a crane back before an SO exists.",
  MAINTENANCE: "Your queue is the S01 maintenance check. Mark every crane Deployable or Non-Deployable with a reason.",
  FINANCE: "Your queue is S02: deduplicate the inputs and finalise the FIRM list. Overrides need a written reason.",
  STRATEGY: "Your queue covers S06 awards and S07 deployment. Deployment waits for the current SO to end.",
  BU: "You can view cranes offered to international BUs. This build shows BU responses as read-only history.",
  MARKETING: "You can view the catalogue window and crane records. Catalogue upload is read-only in this build.",
  SCM: "You can view sale and scrap records and add SO details where they are missing.",
  CBO: "Your queue covers sale approval, scrap, claim-backs and conflicts where domestic rental competes with sale.",
  CSO: "Your queue covers below-rate awards, claim-backs and conflicts where international rental competes with sale.",
  MD: "Your queue covers final sale, scrap and escalated conflict decisions.",
};

export function RoleBriefing({ role, name }: { role: string; name: string }) {
  const meta = ROLE_MAP[role as Role];
  const readOnly = READ_ONLY.has(role);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[8px] border border-line bg-panel-2 px-3 py-2.5">
      <span className={`badge ${readOnly ? "badge-slate" : "badge-brand"}`}>
        {readOnly ? <Eye size={12} /> : <ShieldCheck size={12} />}
        {readOnly ? "View only" : "Decision role"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-ink">{meta?.name ?? role}</div>
        <div className="text-[12px] leading-relaxed text-muted">{ROLE_NOTE[role] ?? "You can view the cycle."}</div>
      </div>
      <span className="hidden items-center gap-1.5 text-[12px] text-muted sm:flex">
        <UsersRound size={12} /> {name}
      </span>
    </div>
  );
}
