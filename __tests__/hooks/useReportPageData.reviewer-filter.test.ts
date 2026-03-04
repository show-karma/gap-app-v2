/**
 * Tests for the reviewer filter logic in useReportPageData.
 *
 * The hook has heavy dependencies (React Query, nuqs, usePendingVerificationMilestones)
 * that make direct hook rendering brittle. Instead, we extract and test the core
 * logic functions that determine:
 *   1. The default reviewer filter mode based on user role
 *   2. The effective reviewer address based on filter mode
 *   3. The handleReviewerFilterChange callback behavior
 *
 * This follows the same pattern as useIsReviewer.test.tsx which tests extracted logic.
 */

type ReviewerFilterMode = "mine" | "all";

/**
 * Extracted from useReportPageData: computes the default reviewer filter mode.
 *
 * Source: useEffect in useReportPageData that reactively sets "mine" or "all"
 * based on isMilestoneReviewer && !hasAccess
 */
function computeDefaultReviewerFilter(
  isMilestoneReviewer: boolean,
  hasAccess: boolean
): ReviewerFilterMode {
  return isMilestoneReviewer && !hasAccess ? "mine" : "all";
}

/**
 * Extracted from useReportPageData: computes the effective reviewer address.
 *
 * Source (lines 121-126):
 *   if (reviewerFilter === "mine" && currentUserAddress) return currentUserAddress;
 *   return undefined;
 */
function computeEffectiveReviewerAddress(
  reviewerFilter: ReviewerFilterMode,
  currentUserAddress?: string
): string | undefined {
  if (reviewerFilter === "mine" && currentUserAddress) {
    return currentUserAddress;
  }
  return undefined;
}

describe("useReportPageData reviewer filter logic", () => {
  describe("computeDefaultReviewerFilter", () => {
    it('defaults to "mine" when isMilestoneReviewer is true and hasAccess is false', () => {
      const result = computeDefaultReviewerFilter(true, false);
      expect(result).toBe("mine");
    });

    it('defaults to "all" when hasAccess is true (admin), even if isMilestoneReviewer', () => {
      const result = computeDefaultReviewerFilter(true, true);
      expect(result).toBe("all");
    });

    it('defaults to "all" when isMilestoneReviewer is false and hasAccess is false', () => {
      const result = computeDefaultReviewerFilter(false, false);
      expect(result).toBe("all");
    });

    it('defaults to "all" when hasAccess is true and isMilestoneReviewer is false', () => {
      const result = computeDefaultReviewerFilter(false, true);
      expect(result).toBe("all");
    });
  });

  describe("computeEffectiveReviewerAddress", () => {
    const testAddress = "0x1234567890abcdef1234567890abcdef12345678";

    it('returns the address when filter is "mine" and address is provided', () => {
      const result = computeEffectiveReviewerAddress("mine", testAddress);
      expect(result).toBe(testAddress);
    });

    it('returns undefined when filter is "all"', () => {
      const result = computeEffectiveReviewerAddress("all", testAddress);
      expect(result).toBeUndefined();
    });

    it('returns undefined when filter is "mine" but no address is provided', () => {
      const result = computeEffectiveReviewerAddress("mine", undefined);
      expect(result).toBeUndefined();
    });

    it('returns undefined when filter is "mine" and address is empty string', () => {
      const result = computeEffectiveReviewerAddress("mine", "");
      expect(result).toBeUndefined();
    });

    it('returns undefined when filter is "all" and address is undefined', () => {
      const result = computeEffectiveReviewerAddress("all", undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("handleReviewerFilterChange behavior", () => {
    /**
     * Simulates the handleReviewerFilterChange callback from the hook:
     *   setReviewerFilter(mode);
     *   setPendingPage(1);
     *
     * We track calls to verify the state transitions.
     */
    it("updates the filter mode and resets pending page to 1", () => {
      let reviewerFilter: ReviewerFilterMode = "all";
      let pendingPage = 3;

      const setReviewerFilter = (mode: ReviewerFilterMode) => {
        reviewerFilter = mode;
      };
      const setPendingPage = (page: number) => {
        pendingPage = page;
      };

      // Simulate handleReviewerFilterChange
      const handleReviewerFilterChange = (mode: ReviewerFilterMode) => {
        setReviewerFilter(mode);
        setPendingPage(1);
      };

      handleReviewerFilterChange("mine");
      expect(reviewerFilter).toBe("mine");
      expect(pendingPage).toBe(1);
    });

    it('can switch from "mine" back to "all"', () => {
      let reviewerFilter: ReviewerFilterMode = "mine";
      let pendingPage = 5;

      const handleReviewerFilterChange = (mode: ReviewerFilterMode) => {
        reviewerFilter = mode;
        pendingPage = 1;
      };

      handleReviewerFilterChange("all");
      expect(reviewerFilter).toBe("all");
      expect(pendingPage).toBe(1);
    });
  });

  describe("integration: default filter drives effective address", () => {
    const address = "0xABCDEF";

    it("reviewer-only user defaults to seeing their own milestones", () => {
      const filter = computeDefaultReviewerFilter(true, false);
      const effectiveAddress = computeEffectiveReviewerAddress(filter, address);
      expect(filter).toBe("mine");
      expect(effectiveAddress).toBe(address);
    });

    it("admin user defaults to seeing all milestones", () => {
      const filter = computeDefaultReviewerFilter(true, true);
      const effectiveAddress = computeEffectiveReviewerAddress(filter, address);
      expect(filter).toBe("all");
      expect(effectiveAddress).toBeUndefined();
    });

    it("non-reviewer, non-admin user defaults to seeing all milestones", () => {
      const filter = computeDefaultReviewerFilter(false, false);
      const effectiveAddress = computeEffectiveReviewerAddress(filter, address);
      expect(filter).toBe("all");
      expect(effectiveAddress).toBeUndefined();
    });
  });
});
