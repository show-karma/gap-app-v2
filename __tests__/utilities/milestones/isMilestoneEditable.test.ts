import { describe, expect, it } from "vitest";
import { convertToUnifiedMilestones } from "@/hooks/v2/useProjectUpdates";
import type {
  GrantMilestoneCompletionDetails,
  GrantMilestoneVerificationDetails,
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

const VERIFICATION_DETAILS: GrantMilestoneVerificationDetails = {
  description: "looks good",
  verifiedAt: "2026-05-03T00:00:00Z",
  verifiedBy: "0x23B7A53ECFD93803C63B97316D7362EAE59C55B6",
  attestationUID: "0xverified",
};

/**
 * Builds fixtures with the real converter, so they carry exactly the fields the
 * UI receives — notably `completionDetails`, which the converter sets
 * unconditionally, outside its `isCompleted` ternary.
 */
const convertGrantMilestone = (overrides: {
  status: string;
  completionDetails?: GrantMilestoneCompletionDetails | null;
  verificationDetails?: GrantMilestoneVerificationDetails | null;
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
        verificationDetails: overrides.verificationDetails ?? null,
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

describe("isMilestoneEditable", () => {
  it("returns false for a missing milestone", () => {
    expect(isMilestoneEditable(null)).toBe(false);
    expect(isMilestoneEditable(undefined)).toBe(false);
  });

  const cases: Array<{
    name: string;
    milestone: () => UnifiedMilestone;
    editable: boolean;
  }> = [
    {
      name: "pending milestone stays editable",
      milestone: () => convertGrantMilestone({ status: "pending" }),
      editable: true,
    },
    {
      name: "unrecognised future status stays editable (blocklist, not allowlist)",
      milestone: () => convertGrantMilestone({ status: "some-future-status" }),
      editable: true,
    },
    {
      name: "completed milestone is blocked",
      milestone: () =>
        convertGrantMilestone({ status: "completed", completionDetails: COMPLETION_DETAILS }),
      editable: false,
    },
    {
      name: "verified milestone is blocked",
      milestone: () =>
        convertGrantMilestone({ status: "verified", verificationDetails: VERIFICATION_DETAILS }),
      editable: false,
    },
    {
      // Regression guard for GAP-FRONTEND-202: the indexer emits currentStatus
      // verbatim, so this row converts with completed=false and verified=[].
      // completionDetails and the case-normalised status each block it alone.
      name: "UPPERCASE completed milestone is blocked via completionDetails",
      milestone: () =>
        convertGrantMilestone({ status: "COMPLETED", completionDetails: COMPLETION_DETAILS }),
      editable: false,
    },
    {
      name: "approved milestone is blocked (no dedicated field, status only)",
      milestone: () => convertGrantMilestone({ status: "approved" }),
      editable: false,
    },
    {
      name: "rejected milestone is blocked (completionDetails arrive null)",
      milestone: () => convertGrantMilestone({ status: "rejected" }),
      editable: false,
    },
    {
      name: "cancelled milestone is blocked",
      milestone: () => convertGrantMilestone({ status: "cancelled" }),
      editable: false,
    },
  ];

  it.each(cases)("$name", ({ milestone, editable }) => {
    expect(isMilestoneEditable(milestone())).toBe(editable);
  });

  it("blocks the UPPERCASE completed row even without completionDetails", () => {
    // The converter's exact-match `isCompleted` reads this as pending, so the
    // case-normalised status check is the only thing standing in the way.
    const milestone = convertGrantMilestone({ status: "COMPLETED" });
    expect(milestone.completed).toBe(false);
    expect(milestone.source.grantMilestone?.completionDetails).toBeFalsy();
    expect(isMilestoneEditable(milestone)).toBe(false);
  });
});
