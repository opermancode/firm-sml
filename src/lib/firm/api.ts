import "server-only";

import { getState } from "./store";
import { STATUS_MAP, type StatusCode } from "./workflow";
import type {
  ApprovalItem,
  Crane,
  CraneFilters,
  CraneListResult,
  Cycle,
  DashboardData,
  FirmUser,
} from "./types";

export type {
  ApprovalItem,
  Crane,
  CraneFilters,
  CraneListResult,
  Cycle,
  DashboardData,
  FirmUser,
} from "./types";

export async function getCycles(): Promise<Cycle[]> {
  const state = await getState();
  return [...state.cycles].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
}

export async function getCurrentCycle(): Promise<Cycle | null> {
  const cycles = await getCycles();
  return cycles.find((cycle) => cycle.status === "OPEN") ?? cycles[0] ?? null;
}

export async function getCranes(filters: CraneFilters = {}): Promise<CraneListResult> {
  const state = await getState();
  const q = filters.q?.trim().toLowerCase();
  const rows = state.cranes.filter((crane) => {
    if (q && !`${crane.equipmentId} ${crane.description} ${crane.finalCategory ?? ""}`
      .toLowerCase().includes(q)) return false;
    if (filters.status && filters.status !== "ALL" && crane.status !== filters.status) return false;
    if (filters.layer && filters.layer !== "ALL" && STATUS_MAP[crane.status].layer !== filters.layer) return false;
    if (filters.category && filters.category !== "ALL" && crane.finalCategory !== filters.category) return false;
    if (filters.type && filters.type !== "ALL" && STATUS_MAP[crane.status].type !== filters.type) return false;
    if (filters.cycleId && crane.cycleId !== filters.cycleId) return false;
    return true;
  }).sort((a, b) => a.equipmentId.localeCompare(b.equipmentId));

  const byStatus: { code: StatusCode; count: number }[] = Object.keys(STATUS_MAP)
    .map((code) => ({ code: code as StatusCode, count: rows.filter((r) => r.status === code).length }))
    .filter((entry) => entry.count > 0);

  const byCategory = (["OLD_FLEET", "NRG", "NON_DEPLOYABLE", "NOT_IN_FIRM"] as const)
    .map((category) => ({ category, count: rows.filter((r) => r.finalCategory === category).length }))
    .filter((entry) => entry.count > 0);

  return {
    rows,
    total: rows.length,
    byStatus,
    byCategory,
    counts: {
      all: rows.length,
      active: rows.filter((r) => STATUS_MAP[r.status].type === "Active").length,
      approval: rows.filter((r) => STATUS_MAP[r.status].type === "Approval").length,
      conflict: rows.filter((r) => r.status === "S14").length,
      locked: rows.filter((r) => STATUS_MAP[r.status].type === "Locked").length,
      closed: rows.filter((r) => STATUS_MAP[r.status].type === "Closed").length,
    },
  };
}

export async function getCrane(id: string): Promise<Crane | null> {
  const state = await getState();
  return state.cranes.find((crane) => crane.id === id || crane.equipmentId === id) ?? null;
}

export async function getDashboard(): Promise<DashboardData> {
  const state = await getState();
  const cycle = state.cycles.find((entry) => entry.status === "OPEN") ?? state.cycles[0] ?? null;
  const cranes = state.cranes;
  const byStatus = (Object.keys(STATUS_MAP) as StatusCode[])
    .map((code) => ({ code, count: cranes.filter((crane) => crane.status === code).length }))
    .filter((entry) => entry.count > 0);
  const layerMap = new Map<string, number>();
  for (const crane of cranes) {
    const layer = STATUS_MAP[crane.status].layer;
    layerMap.set(layer, (layerMap.get(layer) ?? 0) + 1);
  }
  const reminders = cranes
    .filter((crane) => ["S01", "S06", "S10", "S11", "S13", "S14"].includes(crane.status))
    .slice(0, 8)
    .map((crane) => ({
      crane,
      reason: STATUS_MAP[crane.status].hint,
      sinceDays: 1 + (crane.id.charCodeAt(crane.id.length - 1) % 5),
    }));

  return {
    cycle,
    cranes,
    total: cranes.length,
    byStatus,
    byLayer: [...layerMap.entries()].map(([layer, count]) => ({ layer, count })).sort(),
    approvals: cranes.filter((crane) => STATUS_MAP[crane.status].type === "Approval").length,
    conflicts: cranes.filter((crane) => crane.status === "S14").length,
    locked: cranes.filter((crane) => STATUS_MAP[crane.status].type === "Locked").length,
    reminders,
  };
}

/** Approvals currently waiting on a given role. */
export async function getApprovalQueue(role: string): Promise<ApprovalItem[]> {
  const state = await getState();
  const roleMap: Partial<Record<string, { roles: string[]; decision: string; note: string }>> = {
    S02: { roles: ["FINANCE"], decision: "Finalise FIRM list after deduplication", note: "Finance Head sign-off required" },
    S06: { roles: ["STRATEGY", "CSO"], decision: "Award crane to international BU", note: "Strategy Head; CSO if yield is below expected" },
    S10: { roles: ["CBO", "MD", "CEO" as string], decision: "Approve sale", note: "FP&A has validated the price" },
    S11: { roles: ["MD", "CBO"], decision: "Approve scrap sale", note: "No acceptable buyer in the sale window" },
    S13: { roles: ["CBO", "CSO", "SALES", "STRATEGY"], decision: "Approve claim-back", note: "Real opportunity details required" },
    S14: { roles: ["CBO", "CSO", "STRATEGY", "MD"], decision: "Resolve conflict", note: "Decision due within 3 working days" },
  };
  return state.cranes
    .map((crane) => {
      const rule = roleMap[crane.status];
      if (!rule || !rule.roles.includes(role)) return null;
      return {
        crane,
        decision: rule.decision,
        approverRole: role as ApprovalItem["approverRole"],
        note: rule.note,
      };
    })
    .filter((item): item is ApprovalItem => item !== null);
}

/** Users are seeded into the DB; auth continues to use those rows. */
export async function getUsers(): Promise<FirmUser[]> {
  const { getDb } = await import("@/db");
  const { asc } = await import("drizzle-orm");
  const { users } = await import("@/db/schema");
  const db = await getDb();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      designation: users.designation,
    })
    .from(users)
    .orderBy(asc(users.name)) as Promise<FirmUser[]>;
}
