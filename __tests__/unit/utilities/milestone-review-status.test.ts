import {
  FILTER_TABS,
  getMilestoneStatus,
  MILESTONE_STATUS_CONFIG,
  type MilestoneFilterKey,
  MilestoneReviewStatus,
  sortMilestones,
} from "@/components/Pages/Admin/MilestonesReview/utils/milestone-review-status";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";

function makeMilestone(
  overrides: Partial<GrantMilestoneWithCompletion> = {}
): GrantMilestoneWithCompletion {
  return {
    uid: "0x123",
    chainId: 1,
    title: "Milestone 1",
    description: "Test milestone",
    dueDate: "2025-06-30",
    status: "pending",
    completionDetails: null,
    verificationDetails: null,
    fundingApplicationCompletion: null,
    ...overrides,
  };
}

describe("getMilestoneStatus", () => {
  it("returns Verified when verificationDetails is present", () => {
    const milestone = makeMilestone({
      verificationDetails: {
        description: "Looks good",
        verifiedAt: "2025-01-16T14:30:00Z",
        verifiedBy: "0xabc",
      },
      completionDetails: {
        description: "Done",
        completedAt: "2025-01-15T10:00:00Z",
        completedBy: "0xdef",
      },
    });
    expect(getMilestoneStatus(milestone)).toBe(MilestoneReviewStatus.Verified);
  });

  it("returns PendingVerification when completionDetails is present but not verified", () => {
    const milestone = makeMilestone({
      completionDetails: {
        description: "Work done",
        completedAt: "2025-01-15T10:00:00Z",
        completedBy: "0xdef",
      },
    });
    expect(getMilestoneStatus(milestone)).toBe(MilestoneReviewStatus.PendingVerification);
  });

  it("returns PendingCompletion when only fundingApplicationCompletion is present", () => {
    const milestone = makeMilestone({
      fundingApplicationCompletion: {
        id: "fc-1",
        referenceNumber: "REF-001",
        milestoneFieldLabel: "milestone_1",
        milestoneTitle: "Phase 1",
        completionText: "Submitted off-chain",
        ownerAddress: "0xabc",
        isVerified: false,
        createdAt: "2025-01-15T10:00:00Z",
        updatedAt: "2025-01-15T10:00:00Z",
      },
    });
    expect(getMilestoneStatus(milestone)).toBe(MilestoneReviewStatus.PendingCompletion);
  });

  it("returns NotStarted when all detail fields are null", () => {
    const milestone = makeMilestone();
    expect(getMilestoneStatus(milestone)).toBe(MilestoneReviewStatus.NotStarted);
  });

  it("prioritizes verificationDetails over completionDetails and fundingApplicationCompletion", () => {
    const milestone = makeMilestone({
      verificationDetails: {
        description: "Verified",
        verifiedAt: "2025-01-16T14:30:00Z",
        verifiedBy: "0xabc",
      },
      completionDetails: {
        description: "Done",
        completedAt: "2025-01-15T10:00:00Z",
        completedBy: "0xdef",
      },
      fundingApplicationCompletion: {
        id: "fc-1",
        referenceNumber: "REF-001",
        milestoneFieldLabel: "milestone_1",
        milestoneTitle: "Phase 1",
        completionText: "Submitted",
        ownerAddress: "0xabc",
        isVerified: true,
        createdAt: "2025-01-15T10:00:00Z",
        updatedAt: "2025-01-16T14:30:00Z",
      },
    });
    expect(getMilestoneStatus(milestone)).toBe(MilestoneReviewStatus.Verified);
  });

  it("prioritizes completionDetails over fundingApplicationCompletion", () => {
    const milestone = makeMilestone({
      completionDetails: {
        description: "On-chain completion",
        completedAt: "2025-01-15T10:00:00Z",
        completedBy: "0xdef",
      },
      fundingApplicationCompletion: {
        id: "fc-1",
        referenceNumber: "REF-001",
        milestoneFieldLabel: "milestone_1",
        milestoneTitle: "Phase 1",
        completionText: "Off-chain",
        ownerAddress: "0xabc",
        isVerified: false,
        createdAt: "2025-01-15T10:00:00Z",
        updatedAt: "2025-01-15T10:00:00Z",
      },
    });
    expect(getMilestoneStatus(milestone)).toBe(MilestoneReviewStatus.PendingVerification);
  });
});

describe("MilestoneReviewStatus enum", () => {
  it("has exactly 4 members", () => {
    const values = Object.values(MilestoneReviewStatus);
    expect(values).toHaveLength(4);
  });

  it("uses snake_case string values", () => {
    expect(MilestoneReviewStatus.Verified).toBe("verified");
    expect(MilestoneReviewStatus.PendingVerification).toBe("pending_verification");
    expect(MilestoneReviewStatus.PendingCompletion).toBe("pending_completion");
    expect(MilestoneReviewStatus.NotStarted).toBe("not_started");
  });
});

describe("MILESTONE_STATUS_CONFIG", () => {
  it("has an entry for every enum member", () => {
    for (const status of Object.values(MilestoneReviewStatus)) {
      expect(MILESTONE_STATUS_CONFIG[status]).toBeDefined();
      expect(MILESTONE_STATUS_CONFIG[status].label).toBeTruthy();
      expect(MILESTONE_STATUS_CONFIG[status].badgeColor).toBeTruthy();
      expect(MILESTONE_STATUS_CONFIG[status].filterLabel).toBeTruthy();
    }
  });

  it("returns correct label and color for Verified", () => {
    const config = MILESTONE_STATUS_CONFIG[MilestoneReviewStatus.Verified];
    expect(config.label).toBe("Verified");
    expect(config.badgeColor).toContain("bg-green");
  });

  it("returns correct label for PendingCompletion (differs from filterLabel)", () => {
    const config = MILESTONE_STATUS_CONFIG[MilestoneReviewStatus.PendingCompletion];
    expect(config.label).toBe("Pending Completion and Verification");
    expect(config.filterLabel).toBe("Pending Completion");
  });
});

describe("FILTER_TABS", () => {
  it("starts with 'all' tab", () => {
    expect(FILTER_TABS[0]).toEqual({ key: "all", label: "All" });
  });

  it("has one tab per enum member plus 'all'", () => {
    const enumCount = Object.values(MilestoneReviewStatus).length;
    expect(FILTER_TABS).toHaveLength(enumCount + 1);
  });

  it("uses filterLabel from config for each status tab", () => {
    const statusTabs = FILTER_TABS.slice(1);
    for (const tab of statusTabs) {
      const config = MILESTONE_STATUS_CONFIG[tab.key as MilestoneReviewStatus];
      expect(tab.label).toBe(config.filterLabel);
    }
  });

  it("has unique keys", () => {
    const keys = FILTER_TABS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keys are valid MilestoneFilterKey values", () => {
    const validKeys = new Set<MilestoneFilterKey>(["all", ...Object.values(MilestoneReviewStatus)]);
    for (const tab of FILTER_TABS) {
      expect(validKeys.has(tab.key)).toBe(true);
    }
  });
});

describe("sortMilestones", () => {
  const verified = (dueDate: string) =>
    makeMilestone({
      uid: `v-${dueDate}`,
      dueDate,
      verificationDetails: {
        description: "OK",
        verifiedAt: "2025-01-16T00:00:00Z",
        verifiedBy: "0xabc",
      },
      completionDetails: {
        description: "Done",
        completedAt: "2025-01-15T00:00:00Z",
        completedBy: "0xdef",
      },
    });

  const pending = (dueDate: string) =>
    makeMilestone({
      uid: `p-${dueDate}`,
      dueDate,
      completionDetails: {
        description: "Done",
        completedAt: "2025-01-15T00:00:00Z",
        completedBy: "0xdef",
      },
    });

  const notStarted = (dueDate: string) => makeMilestone({ uid: `ns-${dueDate}`, dueDate });

  it("sorts non-verified milestones before verified ones", () => {
    const milestones = [verified("2025-01-01"), pending("2025-06-01"), notStarted("2025-03-01")];
    const sorted = sortMilestones(milestones);
    const uids = sorted.map((m) => m.uid);
    expect(uids).toEqual(["ns-2025-03-01", "p-2025-06-01", "v-2025-01-01"]);
  });

  it("sorts by due date ascending within non-verified group", () => {
    const milestones = [pending("2025-06-01"), notStarted("2025-01-01"), pending("2025-03-01")];
    const sorted = sortMilestones(milestones);
    const uids = sorted.map((m) => m.uid);
    expect(uids).toEqual(["ns-2025-01-01", "p-2025-03-01", "p-2025-06-01"]);
  });

  it("sorts by due date ascending within verified group", () => {
    const milestones = [verified("2025-12-01"), verified("2025-02-01"), verified("2025-07-01")];
    const sorted = sortMilestones(milestones);
    const uids = sorted.map((m) => m.uid);
    expect(uids).toEqual(["v-2025-02-01", "v-2025-07-01", "v-2025-12-01"]);
  });

  it("does not mutate the original array", () => {
    const milestones = [verified("2025-06-01"), notStarted("2025-01-01")];
    const original = [...milestones];
    sortMilestones(milestones);
    expect(milestones.map((m) => m.uid)).toEqual(original.map((m) => m.uid));
  });

  it("handles empty array", () => {
    expect(sortMilestones([])).toEqual([]);
  });

  it("handles single milestone", () => {
    const milestones = [notStarted("2025-01-01")];
    const sorted = sortMilestones(milestones);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].uid).toBe("ns-2025-01-01");
  });

  it("accepts a custom status function", () => {
    const milestones = [notStarted("2025-06-01"), notStarted("2025-01-01")];
    // Force first milestone to be treated as verified via custom statusFn
    const sorted = sortMilestones(milestones, (m) =>
      m.uid === "ns-2025-06-01" ? MilestoneReviewStatus.Verified : MilestoneReviewStatus.NotStarted
    );
    expect(sorted.map((m) => m.uid)).toEqual(["ns-2025-01-01", "ns-2025-06-01"]);
  });
});
