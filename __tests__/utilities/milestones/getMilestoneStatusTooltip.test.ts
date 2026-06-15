import { describe, expect, it } from "vitest";
import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement";
import { getMilestoneStatusTooltip } from "@/utilities/milestones/getMilestoneStatusTooltip";

describe("getMilestoneStatusTooltip", () => {
  it("describes a completed milestone with its status date", () => {
    expect(
      getMilestoneStatusTooltip(MilestoneLifecycleStatus.COMPLETED, "2026-01-02T00:00:00Z", null)
    ).toBe("Completed on Jan 2, 2026");
  });

  it("falls back to the canonical Completed label without a date", () => {
    expect(getMilestoneStatusTooltip(MilestoneLifecycleStatus.COMPLETED, null, null)).toBe(
      "Completed"
    );
  });

  it("describes a verified milestone with its status date", () => {
    expect(
      getMilestoneStatusTooltip(MilestoneLifecycleStatus.VERIFIED, "2026-01-02T00:00:00Z", null)
    ).toBe("Verified on Jan 2, 2026");
  });

  it("describes a past-due milestone with its due date", () => {
    expect(
      getMilestoneStatusTooltip(MilestoneLifecycleStatus.PAST_DUE, null, "2026-01-02T00:00:00Z")
    ).toBe("Due Jan 2, 2026");
  });

  it("uses the canonical 'Past Due' fallback (never lowercase 'Past due')", () => {
    const tooltip = getMilestoneStatusTooltip(MilestoneLifecycleStatus.PAST_DUE, null, null);
    expect(tooltip).toBe("Past Due");
    expect(tooltip).not.toBe("Past due");
  });

  it("combines created and due dates for a pending milestone", () => {
    expect(
      getMilestoneStatusTooltip(
        MilestoneLifecycleStatus.PENDING,
        "2026-01-01T00:00:00Z",
        "2026-02-01T00:00:00Z"
      )
    ).toBe("Created Jan 1, 2026 · Due Feb 1, 2026");
  });

  it("falls back to the Pending label with no dates", () => {
    expect(getMilestoneStatusTooltip(MilestoneLifecycleStatus.PENDING, null, null)).toBe("Pending");
  });
});
