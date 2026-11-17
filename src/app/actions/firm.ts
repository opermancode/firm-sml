"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { mutate } from "@/lib/firm/store";
import { parseFirmWorkbook } from "@/lib/firm/intake";
import {
  CATEGORY_LABEL, STATUS_MAP, dedupe,
  type FinalCategory, type Role, type StatusCode,
} from "@/lib/firm/workflow";
import type { Crane } from "@/lib/firm/types";

export type ActionState = { error?: string; ok?: string } | null;

const now = () => new Date().toISOString();
const entryId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const ALLOWED: Record<string, Role[]> = {
  SUBMIT_SALES: ["SALES"],
  SUBMIT_MAINTENANCE: ["MAINTENANCE"],
  FINALISE_LIST: ["FINANCE", "GLOBAL_ADMIN"],
  APPROVE_AWARD: ["STRATEGY", "CSO", "GLOBAL_ADMIN"],
  APPROVE_SALE: ["CBO", "MD", "GLOBAL_ADMIN"],
  APPROVE_SCRAP: ["MD", "CBO", "GLOBAL_ADMIN"],
  APPROVE_CLAIM: ["CBO", "CSO", "SALES", "STRATEGY", "GLOBAL_ADMIN"],
  RESOLVE_CONFLICT: ["CBO", "CSO", "STRATEGY", "MD", "GLOBAL_ADMIN"],
  DEPLOY: ["STRATEGY", "GLOBAL_ADMIN"],
  RECORD_SO: ["SALES", "STRATEGY", "SCM", "GLOBAL_ADMIN"],
};

const nextStatus: Record<string, StatusCode> = {
  APPROVE_AWARD: "S07",
  APPROVE_SALE: "S18",
  APPROVE_SCRAP: "S12",
  APPROVE_CLAIM: "S15",
  DEPLOY: "S16",
  REJECT_AWARD: "S09",
  REJECT_SALE: "S09",
  REJECT_SCRAP: "S20",
  REJECT_CLAIM: "S10",
};

/** One entry point for every crane action. Role and SAP rules are checked here. */
export async function craneAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const craneId = String(formData.get("craneId") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();

  if (!craneId || !kind) return { error: "Missing crane or action." };
  const allowed = ALLOWED[kind];
  if (!allowed || !allowed.includes(user.role as Role)) {
    return { error: `Your role (${user.role}) cannot perform this action.` };
  }
  if (["FINALISE_LIST", "APPROVE_AWARD", "APPROVE_SALE", "APPROVE_SCRAP", "APPROVE_CLAIM", "RESOLVE_CONFLICT"].includes(kind) && !comment) {
    return { error: "A comment is mandatory for every approval decision." };
  }

  let message = "Action recorded.";
  await mutate((state) => {
    const crane = state.cranes.find((c) => c.id === craneId || c.equipmentId === craneId);
    if (!crane) throw new Error("Crane not found.");
    const at = now();
    const actor = user.name;

    if (kind === "SUBMIT_SALES") {
      crane.sales = {
        marketable: String(formData.get("marketable") ?? "Marketable") as "Marketable" | "Not marketable",
        nrg: String(formData.get("nrg") ?? "false") === "true",
        expectedMonths: Number(formData.get("expectedMonths") ?? 0) || null,
        remarks: comment || null,
        submittedBy: actor,
        submittedAt: at,
      };
      crane.flags.nrg = crane.sales.nrg ?? false;
      const result = dedupe(crane.flags);
      crane.finalCategory = result.category;
      crane.audit.unshift({ id: entryId("a"), actor, actorRole: user.role as Role, action: "Sales check submitted", detail: `${crane.equipmentId} · marketable ${crane.sales.marketable}, NRG ${crane.sales.nrg}`, at });
      if (crane.maintenance.submittedBy) {
        crane.status = result.status;
        message = `Both checks are in. Routed to ${result.route} (${result.status}).}`;
      }
    } else if (kind === "SUBMIT_MAINTENANCE") {
      const deployable = String(formData.get("deployable") ?? "true") === "true";
      crane.maintenance = {
        deployable,
        reason: deployable ? null : comment || "No reason supplied",
        submittedBy: actor,
        submittedAt: at,
      };
      crane.flags.nonDeployable = !deployable;
      const result = dedupe(crane.flags);
      crane.finalCategory = result.category;
      crane.audit.unshift({ id: entryId("a"), actor, actorRole: user.role as Role, action: "Maintenance check submitted", detail: `${crane.equipmentId} · ${deployable ? "Deployable" : "Non-Deployable"}`, at });
      if (crane.sales.submittedBy) {
        crane.status = result.status;
        message = `Both checks are in. Routed to ${result.route} (${result.status}).`;
      }
    } else if (kind === "FINALISE_LIST") {
      if (crane.status !== "S02") throw new Error("This crane is not under Finance review.");
      const result = dedupe(crane.flags);
      crane.finalCategory = result.category;
      crane.status = result.status;
      crane.approvals.push({ id: entryId("ap"), decision: "Final FIRM list after deduplication", approverRole: user.role as Role, approverName: actor, action: "APPROVED", comment, at });
      crane.audit.unshift({ id: entryId("a"), actor, actorRole: user.role as Role, action: "FIRM list finalised", detail: `${crane.equipmentId} → ${CATEGORY_LABEL[result.category]} / ${result.route}`, at });
      message = `Finalised as ${CATEGORY_LABEL[result.category]} (${result.status}).`;
    } else if (kind === "APPROVE_AWARD" || kind === "REJECT_AWARD") {
      const approve = kind === "APPROVE_AWARD";
      if (!crane.award) throw new Error("No award to decide on.");
      crane.award.approvedBy = approve ? actor : null;
      crane.award.approvedAt = approve ? at : null;
      crane.status = approve ? "S07" : "S05";
      crane.approvals.push({ id: entryId("ap"), decision: "Award crane to international BU", approverRole: user.role as Role, approverName: actor, action: approve ? "APPROVED" : "REJECTED", comment, at });
      crane.audit.unshift({ id: entryId("a"), actor, actorRole: user.role as Role, action: approve ? "BU award approved" : "BU award rejected", detail: `${crane.equipmentId} · ${crane.award.bu}`, at });
      message = approve ? "Award approved. Crane reserved (S07)." : "Award rejected. Back to bid evaluation (S05).";
    } else if (kind === "APPROVE_SALE" || kind === "REJECT_SALE") {
      const approve = kind === "APPROVE_SALE";
      crane.status = approve ? "S18" : "S09";
      if (approve) crane.sap.soNumber = String(formData.get("soNumber") ?? "").trim() || crane.sap.soNumber;
      crane.approvals.push({ id: entryId("ap"), decision: "Approve sale", approverRole: user.role as Role, approverName: actor, action: approve ? "APPROVED" : "REJECTED", comment, at });
      crane.audit.unshift({ id: entryId("a"), actor, actorRole: user.role as Role, action: approve ? "Sale approved · SO recorded" : "Sale rejected", detail: `${crane.equipmentId}${approve ? ` · SO ${crane.sap.soNumber ?? "pending"}` : ""}`, at });
      message = approve ? "Sale approved. Crane locked in SAP (S18)." : "Sale rejected. Back to listed for sale (S09).";
    } else if (kind === "APPROVE_SCRAP" || kind === "REJECT_SCRAP") {
      const approve = kind === "APPROVE_SCRAP";
      crane.status = approve ? "S12" : "S20";
      crane.approvals.push({ id: entryId("ap"), decision: "Approve scrap sale", approverRole: user.role as Role, approverName: actor, action: approve ? "APPROVED" : "REJECTED", comment, at });
      crane.audit.unshift({ id: entryId("a"), actor, actorRole: user.role as Role, action: approve ? "Scrap sale approved" : "Scrap not approved", detail: `${crane.equipmentId} · ${comment}`, at });
      message = approve ? "Scrap sale approved (S12)." : "Scrap declined. Crane carried forward (S20).";
    } else if (kind === "APPROVE_CLAIM" || kind === "REJECT_CLAIM") {
      const approve = kind === "APPROVE_CLAIM";
      if (!crane.claimBack) throw new Error("No claim-back to decide on.");
      crane.claimBack.status = approve ? "APPROVED" : "REJECTED";
      crane.claimBack.decidedBy = actor;
      crane.claimBack.decidedAt = at;
      crane.status = approve ? "S15" : crane.claimBack.team === "International" ? "S07" : "S10";
      crane.approvals.push({ id: entryId("ap"), decision: "Approve claim-back", approverRole: user.role as Role, approverName: actor, action: approve ? "APPROVED" : "REJECTED", comment, at });
      crane.audit.unshift({ id: entryId("a"), actor, actorRole: user.role as Role, action: approve ? "Claim-back approved" : "Claim-back rejected", detail: `${crane.equipmentId} · ${crane.claimBack.customer}`, at });
      message = approve ? "Claim-back approved (S15)." : "Claim-back rejected.";
    } else if (kind === "RESOLVE_CONFLICT") {
      if (!crane.conflict) throw new Error("No conflict to resolve.");
      crane.conflict.status = "RESOLVED";
      crane.conflict.winner = decision || "Rental";
      crane.conflict.reason = comment;
      crane.conflict.decidedByUser = actor;
      crane.conflict.decidedAt = at;
      crane.status = crane.conflict.winner === "Sale" ? "S10" : "S15";
      crane.approvals.push({ id: entryId("ap"), decision: "Resolve conflict", approverRole: user.role as Role, approverName: actor, action: "APPROVED", comment, at });
      crane.audit.unshift({ id: entryId("a"), actor, actorRole: user.role as Role, action: "Conflict resolved", detail: `${crane.equipmentId} · winner ${crane.conflict.winner} · ${comment}`, at });
      message = `Conflict resolved in favour of ${crane.conflict.winner}.`;
    } else if (kind === "DEPLOY") {
      if (crane.sap.soEnd && crane.sap.soEnd > now().slice(0, 10)) {
        throw new Error(`SAP hard stop: execution allowed only from ${crane.sap.soEnd}.`);
      }
      crane.sap.assetTransferNo = String(formData.get("assetTransferNo") ?? "").trim() || "PENDING";
      crane.status = "S16";
      crane.audit.unshift({ id: entryId("a"), actor, actorRole: user.role as Role, action: "International transfer recorded", detail: `${crane.equipmentId} · ${crane.sap.assetTransferNo}`, at });
      message = "Asset transfer recorded. Crane locked (S16).";
    } else if (kind === "RECORD_SO") {
      crane.sap.soNumber = String(formData.get("soNumber") ?? "").trim() || crane.sap.soNumber;
      crane.sap.soStart = String(formData.get("soStart") ?? "").trim() || crane.sap.soStart;
      crane.sap.soEnd = String(formData.get("soEnd") ?? "").trim() || crane.sap.soEnd;
      crane.audit.unshift({ id: entryId("a"), actor, actorRole: user.role as Role, action: "SAP SO details recorded", detail: `${crane.equipmentId} · ${crane.sap.soNumber} · execution from ${crane.sap.soEnd ?? "immediately"}`, at });
      message = `SO recorded. Execution allowed from ${crane.sap.soEnd ?? "immediately"}.`;
    }
    if (!STATUS_MAP[crane.status]) throw new Error("Invalid status produced.");
  });

  revalidatePath("/");
  revalidatePath("/cranes");
  revalidatePath("/approvals");
  revalidatePath("/cycles");
  return { ok: message };
}

export type ValidateState = {
  preview?: {
    rows: { equipmentId: string; description: string; yom: number; yieldPct: number; utilisationPct: number; age: number; oldFleet: boolean; soNumber: string | null; soEnd: string | null }[];
    issues: { severity: string; row: number | null; field: string | null; message: string }[];
    errorCount: number;
    warningCount: number;
  };
  error?: string;
} | null;

/** Parse and validate without writing anything. */
export async function validateFleetAction(_prev: ValidateState, formData: FormData): Promise<ValidateState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an Excel workbook first." };
  const parsed = parseFirmWorkbook(Buffer.from(await file.arrayBuffer()));
  return {
    preview: {
      rows: parsed.rows.map((row) => ({
        equipmentId: row.equipmentId,
        description: row.description,
        yom: row.yom,
        yieldPct: row.yieldPct,
        utilisationPct: row.utilisationPct,
        age: row.age,
        oldFleet: row.oldFleet,
        soNumber: row.soNumber,
        soEnd: row.soEnd,
      })),
      issues: parsed.issues,
      errorCount: parsed.errorCount,
      warningCount: parsed.warningCount,
    },
  };
}

/** Commit a validated workbook into the current open cycle. */
export async function uploadFleetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!["FPNA", "GLOBAL_ADMIN"].includes(user.role)) {
    return { error: "Only FP&A can start a cycle and upload the fleet." };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an Excel workbook." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseFirmWorkbook(buffer);
  if (parsed.errorCount > 0 || parsed.rows.length === 0) {
    return { error: `${parsed.errorCount} error(s) found. Fix the workbook and validate again before committing.` };
  }

  let added = 0;
  await mutate((state) => {
    const cycle = state.cycles.find((entry) => entry.status === "OPEN") ?? state.cycles[0];
    if (!cycle) throw new Error("No cycle available.");
    const at = now();
    for (const row of parsed.rows) {
      if (state.cranes.some((c) => c.equipmentId === row.equipmentId)) continue;
      const result = dedupe({ oldFleet: row.oldFleet, nrg: false, nonDeployable: false });
      const crane: Crane = {
        id: row.equipmentId,
        equipmentId: row.equipmentId,
        description: row.description,
        yom: row.yom,
        yieldPct: row.yieldPct,
        utilisationPct: row.utilisationPct,
        age: row.age,
        oldFleet: row.oldFleet,
        cycleId: cycle.id,
        status: "S01",
        flags: { oldFleet: row.oldFleet, nrg: false, nonDeployable: false },
        finalCategory: null,
        finalOverride: null,
        sap: {
          currentStatus: (row.sapStatus as "On rent" | "Idle" | "Sold") ?? "Idle",
          soNumber: row.soNumber ?? null,
          soStart: row.soStart ?? null,
          soEnd: row.soEnd ?? null,
          assetTransferNo: null,
        },
        sales: { marketable: null, nrg: null, expectedMonths: null, remarks: null, submittedBy: null, submittedAt: null },
        maintenance: { deployable: null, reason: null, submittedBy: null, submittedAt: null },
        buQuotes: [],
        award: null,
        catalogue: { uploaded: false, files: [], uploadedBy: null, at: null },
        saleQuotes: [],
        claimBack: null,
        conflict: null,
        approvals: [],
        audit: [{ id: entryId("a"), actor: user.name, actorRole: user.role as Role, action: "Fleet uploaded", detail: `${row.equipmentId} · age ${row.age} · Old Fleet ${row.oldFleet} · SO ${row.soNumber ?? "none"} · result ${result.category}`, at }],
      };
      state.cranes.push(crane);
      added += 1;
    }
  });

  revalidatePath("/");
  revalidatePath("/cranes");
  revalidatePath("/cycles");
  return { ok: `${added} crane(s) added to the cycle. Sales and Maintenance checks are now open in parallel.` };
}
