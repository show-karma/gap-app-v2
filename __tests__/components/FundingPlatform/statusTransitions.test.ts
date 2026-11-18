import { isAllowedStatusTransition } from "@/components/FundingPlatform/statusTransitions";

describe("isAllowedStatusTransition", () => {
  it.each(["under_review", "pending", "revision_requested", "approved", "rejected", "resubmitted"])(
    "rejects every manual transition out of draft (draft -> %s)",
    (target) => {
      expect(isAllowedStatusTransition("draft", target)).toBe(false);
    }
  );

  it.each(["pending", "under_review", "revision_requested", "approved", "rejected", "resubmitted"])(
    "never allows moving %s back to draft",
    (from) => {
      expect(isAllowedStatusTransition(from, "draft")).toBe(false);
    }
  );

  it("keeps the existing pending -> under_review transition", () => {
    expect(isAllowedStatusTransition("pending", "under_review")).toBe(true);
  });
});
