import type { GrantMilestone } from "@/types/v2/grant";
import { applyOverrides, type DeepPartial, randomAddress, seq } from "./utils";

// ─── Milestone factory (standalone, re-uses GrantMilestone type) ───

export function createMockMilestone(overrides?: DeepPartial<GrantMilestone>): GrantMilestone {
  const n = seq();
  const defaults: GrantMilestone = {
    uid: `0xms${n.toString(16).padStart(12, "0")}`,
    chainID: 10,
    title: `Milestone ${n}: Smart contract audit completion`,
    description:
      "Complete a third-party security audit of all deployed smart contracts and publish the report.",
    priority: n,
    endsAt: Math.floor(Date.now() / 1000) + 60 * 86400,
    startsAt: Math.floor(Date.now() / 1000),
    currentStatus: "pending",
    verified: [],
    createdAt: "2024-06-01T12:00:00Z",
    updatedAt: "2024-06-01T12:00:00Z",
  };
  return applyOverrides(defaults, overrides);
}

// ─── Status presets ───

export function pendingMilestone(overrides?: DeepPartial<GrantMilestone>): GrantMilestone {
  return createMockMilestone({
    currentStatus: "pending",
    completed: null,
    verified: [],
    ...overrides,
  } as DeepPartial<GrantMilestone>);
}

export function completedMilestone(overrides?: DeepPartial<GrantMilestone>): GrantMilestone {
  return createMockMilestone({
    currentStatus: "completed",
    completed: {
      uid: `0xcompleted-${seq()}`,
      chainID: 10,
      createdAt: "2024-08-01T10:00:00Z",
      attester: randomAddress(),
      data: {
        reason: "All deliverables met and verified by the community",
        proofOfWork: "https://github.com/karma-protocol/audit-report/blob/main/REPORT.md",
        completionPercentage: 100,
      },
    },
    verified: [],
    ...overrides,
  } as DeepPartial<GrantMilestone>);
}

export function verifiedMilestone(overrides?: DeepPartial<GrantMilestone>): GrantMilestone {
  const verifier = randomAddress();
  return createMockMilestone({
    currentStatus: "completed",
    completed: {
      uid: `0xcompleted-${seq()}`,
      chainID: 10,
      createdAt: "2024-08-01T10:00:00Z",
      attester: randomAddress(),
      data: {
        reason: "Audit finalized and published",
        proofOfWork: "https://github.com/karma-protocol/audit-report/blob/main/REPORT.md",
        completionPercentage: 100,
      },
    },
    verified: [
      {
        uid: `0xverification-${seq()}`,
        attester: verifier,
        reason: "Verified: audit report matches contract deployment",
        createdAt: "2024-08-05T14:00:00Z",
      },
    ],
    ...overrides,
  } as DeepPartial<GrantMilestone>);
}

// ─── Milestone with evidence helper ───

export function milestoneWithEvidence(
  evidence: { proofOfWork: string; reason?: string },
  overrides?: DeepPartial<GrantMilestone>
): GrantMilestone {
  return completedMilestone({
    completed: {
      data: {
        proofOfWork: evidence.proofOfWork,
        reason: evidence.reason ?? "Evidence submitted",
      },
    },
    ...overrides,
  } as DeepPartial<GrantMilestone>);
}
