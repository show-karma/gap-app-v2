import {
  FILTER_TABS,
  getMilestoneStatus,
  MILESTONE_STATUS_CONFIG,
  type MilestoneFilterKey,
  MilestoneReviewStatus,
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
