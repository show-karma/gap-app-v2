import { describe, expect, it } from "vitest";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { isMilestoneEditable } from "@/utilities/milestones/isMilestoneEditable";

const COMPLETION = {
  uid: "0xcompleted",
  chainID: 8453,
  createdAt: "2026-05-02T00:00:00Z",
  attester: "0x23B7A53ECFD93803C63B97316D7362EAE59C55B6",
  data: { reason: "done" },
};

const VERIFICATION = {
  uid: "0xverified",
  chainID: 8453,
  createdAt: "2026-05-03T00:00:00Z",
  attester: "0x23B7A53ECFD93803C63B97316D7362EAE59C55B6",
};

const grantMilestone = (overrides?: {
  completed?: unknown;
  milestoneCompleted?: unknown;
  verified?: unknown;
}): UnifiedMilestone =>
  ({
    uid: "0xac1805",
    type: "grant",
    title: "Test",
    completed: overrides?.completed ?? false,
    createdAt: "2026-05-01T00:00:00Z",
    chainID: 8453,
    refUID: "0x0",
    source: {
      type: "grant",
      grantMilestone: {
        milestone: {
          uid: "0xac1805",
          chainID: 8453,
          title: "Test",
          completed: overrides?.milestoneCompleted ?? null,
          verified: overrides?.verified ?? [],
        },
        grant: { uid: "0xgrant", chainID: 8453 },
      },
    },
  }) as unknown as UnifiedMilestone;

const projectMilestone = (overrides?: {
  completed?: unknown;
  milestoneCompleted?: unknown;
  verified?: unknown;
}): UnifiedMilestone =>
  ({
    uid: "0xproj",
    type: "milestone",
    title: "Test",
    completed: overrides?.completed ?? false,
    createdAt: "2026-05-01T00:00:00Z",
    chainID: 8453,
    refUID: "0x0",
    source: {
      type: "milestone",
      projectMilestone: {
        uid: "0xproj",
        completed: overrides?.milestoneCompleted ?? undefined,
        verified: overrides?.verified ?? undefined,
      },
    },
  }) as unknown as UnifiedMilestone;

describe("isMilestoneEditable", () => {
  it("returns false for a missing milestone", () => {
    expect(isMilestoneEditable(null)).toBe(false);
    expect(isMilestoneEditable(undefined)).toBe(false);
  });

  it("returns true for a pending milestone", () => {
    expect(isMilestoneEditable(grantMilestone())).toBe(true);
    expect(isMilestoneEditable(projectMilestone())).toBe(true);
  });

  it("returns false when the unified `completed` flag is set", () => {
    expect(isMilestoneEditable(grantMilestone({ completed: true }))).toBe(false);
    expect(isMilestoneEditable(projectMilestone({ completed: true }))).toBe(false);
  });

  it("returns false when the source milestone carries a completion attestation", () => {
    expect(isMilestoneEditable(grantMilestone({ milestoneCompleted: COMPLETION }))).toBe(false);
    expect(isMilestoneEditable(projectMilestone({ milestoneCompleted: COMPLETION }))).toBe(false);
  });

  it("returns false when the milestone has verifications", () => {
    expect(isMilestoneEditable(grantMilestone({ verified: [VERIFICATION] }))).toBe(false);
    // Legacy project-milestone payloads surface `verified` as a plain boolean
    expect(isMilestoneEditable(projectMilestone({ verified: true }))).toBe(false);
  });

  it("treats an empty verification array as still editable", () => {
    expect(isMilestoneEditable(grantMilestone({ verified: [] }))).toBe(true);
    expect(isMilestoneEditable(projectMilestone({ verified: false }))).toBe(true);
  });
});
