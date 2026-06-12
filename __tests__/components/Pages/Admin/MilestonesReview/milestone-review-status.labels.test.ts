import { describe, expect, it } from "vitest";
import {
  FILTER_TABS,
  MILESTONE_STATUS_CONFIG,
  MilestoneReviewStatus,
} from "@/components/Pages/Admin/MilestonesReview/utils/milestone-review-status";
import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement";
import { getMilestoneStatusTooltip } from "@/utilities/milestones/getMilestoneStatusTooltip";

const FORBIDDEN = ["Late", "Past due"];

describe("milestone review status terminology guardrail (#1417)", () => {
  it("labels the Late status as 'Past Due'", () => {
    expect(MILESTONE_STATUS_CONFIG[MilestoneReviewStatus.Late].label).toBe("Past Due");
    expect(MILESTONE_STATUS_CONFIG[MilestoneReviewStatus.Late].filterLabel).toBe("Past Due");
  });

  it("never surfaces 'Late' or lowercase 'Past due' in any status config entry", () => {
    for (const config of Object.values(MILESTONE_STATUS_CONFIG)) {
      for (const forbidden of FORBIDDEN) {
        expect(config.label).not.toBe(forbidden);
        expect(config.filterLabel).not.toBe(forbidden);
      }
    }
  });

  it("never surfaces 'Late' or lowercase 'Past due' in any filter tab", () => {
    for (const tab of FILTER_TABS) {
      for (const forbidden of FORBIDDEN) {
        expect(tab.label).not.toBe(forbidden);
      }
    }
  });

  it("keeps review-status labels in sync with the canonical lifecycle vocabulary", () => {
    expect(MILESTONE_STATUS_CONFIG[MilestoneReviewStatus.Pending].label).toBe("Pending");
    expect(MILESTONE_STATUS_CONFIG[MilestoneReviewStatus.Verified].label).toBe("Verified");
  });
});

describe("shared milestone status tooltip terminology guardrail", () => {
  it("never emits lowercase 'Past due' across any lifecycle status fallback", () => {
    const statuses = [
      MilestoneLifecycleStatus.PENDING,
      MilestoneLifecycleStatus.COMPLETED,
      MilestoneLifecycleStatus.VERIFIED,
      MilestoneLifecycleStatus.PAST_DUE,
    ];
    for (const status of statuses) {
      expect(getMilestoneStatusTooltip(status, null, null)).not.toBe("Past due");
    }
  });
});
