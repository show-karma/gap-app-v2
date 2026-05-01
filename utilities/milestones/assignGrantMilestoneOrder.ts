import type { UnifiedMilestone } from "@/types/v2/roadmap";

interface OrderableMilestone {
  uid: string;
  endsAt?: number;
  createdAt?: string;
}

const getOrderTimestamp = (milestone: OrderableMilestone): number => {
  if (milestone.endsAt) return milestone.endsAt;
  if (!milestone.createdAt) return 0;
  return Math.floor(new Date(milestone.createdAt).getTime() / 1000);
};

/**
 * Builds a stable per-grant ordinal map (uid → { index, total }) for a single
 * grant's milestones. Sorts ascending by `endsAt` (fallback `createdAt`,
 * tiebreak by `uid`) and numbers them 1..N.
 */
export function buildGrantMilestoneOrderMap<T extends OrderableMilestone>(
  milestones: T[]
): Map<string, { index: number; total: number }> {
  const sorted = [...milestones].sort((a, b) => {
    const diff = getOrderTimestamp(a) - getOrderTimestamp(b);
    if (diff !== 0) return diff;
    return a.uid.localeCompare(b.uid);
  });
  const total = sorted.length;
  const map = new Map<string, { index: number; total: number }>();
  sorted.forEach((milestone, idx) => {
    map.set(milestone.uid, { index: idx + 1, total });
  });
  return map;
}

/**
 * Assigns a stable per-grant ordinal (1..N) to every grant milestone that does
 * not already carry one.
 *
 * Milestones are grouped by their parent grant UID, sorted ascending by due date
 * (`endsAt`) with `createdAt` as fallback, then stamped with `grantMilestoneOrder`.
 * Non-grant items (project milestones, updates, impacts, etc.) pass through unchanged.
 *
 * Milestones that already have `grantMilestoneOrder` set (e.g. stamped by the
 * server before status/date/AI filtering) are preserved as-is — recomputing
 * locally on a filtered subset would yield an incorrect total.
 *
 * The original array is not mutated; a new array of new objects is returned.
 */
export function assignGrantMilestoneOrder(milestones: UnifiedMilestone[]): UnifiedMilestone[] {
  const grouped = new Map<string, UnifiedMilestone[]>();

  milestones.forEach((milestone) => {
    if (milestone.type !== "grant") return;
    if (milestone.grantMilestoneOrder) return;
    const grantUID = milestone.source.grantMilestone?.grant.uid;
    if (!grantUID) return;
    const list = grouped.get(grantUID);
    if (list) {
      list.push(milestone);
    } else {
      grouped.set(grantUID, [milestone]);
    }
  });

  const orderByMilestoneUID = new Map<string, { index: number; total: number }>();

  grouped.forEach((groupMilestones) => {
    const groupMap = buildGrantMilestoneOrderMap(groupMilestones);
    groupMap.forEach((order, uid) => {
      orderByMilestoneUID.set(uid, order);
    });
  });

  return milestones.map((milestone) => {
    if (milestone.grantMilestoneOrder) return milestone;
    const order = orderByMilestoneUID.get(milestone.uid);
    if (!order) return milestone;
    return { ...milestone, grantMilestoneOrder: order };
  });
}
