import { describe, expect, it } from "vitest";
import { convertToUnifiedMilestones } from "@/hooks/v2/useProjectUpdates";
import type {
  GrantMilestoneCompletionDetails,
  UnifiedMilestone,
  UpdatesApiResponse,
} from "@/types/v2/roadmap";
import { isMilestoneEditable } from "@/utilities/milestones/isMilestoneEditable";

const COMPLETION_DETAILS: GrantMilestoneCompletionDetails = {
  description: "shipped",
  completedAt: "2026-05-02T00:00:00Z",
  completedBy: "0x23B7A53ECFD93803C63B97316D7362EAE59C55B6",
  attestationUID: "0xcompleted",
};

/**
 * Runs a realistic grant milestone through the real converter, so the fixture
 * matches the shape the UI actually receives rather than a hand-rolled cast.
 */
const convertGrantMilestone = (overrides: {
  status: string;
  completionDetails?: GrantMilestoneCompletionDetails | null;
}): UnifiedMilestone => {
  const response = {
    projectUpdates: [],
    projectMilestones: [],
    grantUpdates: [],
    endorsements: [],
    grantReceived: [],
    grantMilestones: [
      {
        uid: "0xac1805",
        title: "Test Milestone",
        description: "Test",
        chainId: "10",
        dueDate: null,
        createdAt: "2026-05-01T00:00:00Z",
        recipient: "0xb4713F39476841fAF0EA5A555D0B1d451E6B05A1",
        status: overrides.status,
        completionDetails: overrides.completionDetails ?? null,
        verificationDetails: null,
        grant: {
          uid: "0xgrant",
          title: "Test Grant",
          communitySlug: "optimism",
          communityName: "Optimism",
          communityImage: "",
        },
      },
    ],
  } as unknown as UpdatesApiResponse;

  const [converted] = convertToUnifiedMilestones(response);
  return converted;
};

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

  // Fixtures below come from the real converter, so they carry the fields the
  // indexer actually populates (notably `completionDetails`, which the
  // converter sets unconditionally).
  describe("against converter output", () => {
    it("keeps a genuinely pending milestone editable", () => {
      expect(isMilestoneEditable(convertGrantMilestone({ status: "pending" }))).toBe(true);
    });

    it("blocks a lowercase completed milestone", () => {
      const milestone = convertGrantMilestone({
        status: "completed",
        completionDetails: COMPLETION_DETAILS,
      });
      expect(isMilestoneEditable(milestone)).toBe(false);
    });

    it("blocks an UPPERCASE completed milestone (indexer emits currentStatus verbatim)", () => {
      const milestone = convertGrantMilestone({
        status: "COMPLETED",
        completionDetails: COMPLETION_DETAILS,
      });
      // Regression guard: before the case-insensitive fix this milestone
      // converted to completed=false / verified=[] and slipped through.
      expect(milestone.completed).toBeTruthy();
      expect(isMilestoneEditable(milestone)).toBe(false);
    });

    it("blocks an approved milestone, which has no dedicated field", () => {
      const milestone = convertGrantMilestone({ status: "approved" });
      // Nothing but the raw status marks this one.
      expect(milestone.completed).toBe(false);
      expect(milestone.source.grantMilestone?.completionDetails).toBeFalsy();
      expect(isMilestoneEditable(milestone)).toBe(false);
    });

    it("blocks on completionDetails even when the status is unrecognised", () => {
      const milestone = convertGrantMilestone({
        status: "some-future-status",
        completionDetails: COMPLETION_DETAILS,
      });
      expect(isMilestoneEditable(milestone)).toBe(false);
    });
  });
});
