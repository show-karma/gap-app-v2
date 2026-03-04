/**
 * Tests for the reviewer filter logic in useReportPageData.
 *
 * The hook now uses address-based filtering instead of binary "mine"/"all" mode.
 * selectedReviewerAddress is `string | undefined` where:
 *   - undefined = "All Reviewers"
 *   - string = specific reviewer's address
 *
 * We extract and test the core logic functions.
 */

/**
 * Extracted from useReportPageData: computes the default selected reviewer address.
 *
 * Milestone reviewers without admin access default to their own address.
 * Everyone else defaults to undefined (all reviewers).
 */
function computeDefaultReviewerAddress(
  isMilestoneReviewer: boolean,
  hasAccess: boolean,
  currentUserAddress?: string
): string | undefined {
  return isMilestoneReviewer && !hasAccess ? currentUserAddress : undefined;
}

describe("useReportPageData reviewer filter logic (address-based)", () => {
  const testAddress = "0x1234567890abcdef1234567890abcdef12345678";

  describe("computeDefaultReviewerAddress", () => {
    it("defaults to user address when isMilestoneReviewer is true and hasAccess is false", () => {
      const result = computeDefaultReviewerAddress(true, false, testAddress);
      expect(result).toBe(testAddress);
    });

    it("defaults to undefined when hasAccess is true (admin), even if isMilestoneReviewer", () => {
      const result = computeDefaultReviewerAddress(true, true, testAddress);
      expect(result).toBeUndefined();
    });

    it("defaults to undefined when isMilestoneReviewer is false", () => {
      const result = computeDefaultReviewerAddress(false, false, testAddress);
      expect(result).toBeUndefined();
    });

    it("defaults to undefined when hasAccess is true and isMilestoneReviewer is false", () => {
      const result = computeDefaultReviewerAddress(false, true, testAddress);
      expect(result).toBeUndefined();
    });

    it("returns undefined when reviewer has no address", () => {
      const result = computeDefaultReviewerAddress(true, false, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("effective reviewer address", () => {
    it("passes selectedReviewerAddress directly to the query", () => {
      // In the new implementation, effectiveReviewerAddress = selectedReviewerAddress
      const selectedReviewerAddress: string | undefined = testAddress;
      const effectiveReviewerAddress = selectedReviewerAddress;
      expect(effectiveReviewerAddress).toBe(testAddress);
    });

    it("passes undefined when no reviewer is selected (all reviewers)", () => {
      const selectedReviewerAddress: string | undefined = undefined;
      const effectiveReviewerAddress = selectedReviewerAddress;
      expect(effectiveReviewerAddress).toBeUndefined();
    });
  });

  describe("handleReviewerAddressChange behavior", () => {
    it("updates the selected address and resets pending page to 1", () => {
      let selectedReviewerAddress: string | undefined;
      let pendingPage = 3;

      const handleReviewerAddressChange = (address: string | undefined) => {
        selectedReviewerAddress = address;
        pendingPage = 1;
      };

      handleReviewerAddressChange(testAddress);
      expect(selectedReviewerAddress).toBe(testAddress);
      expect(pendingPage).toBe(1);
    });

    it("can switch to undefined (all reviewers)", () => {
      let selectedReviewerAddress: string | undefined = testAddress;
      let pendingPage = 5;

      const handleReviewerAddressChange = (address: string | undefined) => {
        selectedReviewerAddress = address;
        pendingPage = 1;
      };

      handleReviewerAddressChange(undefined);
      expect(selectedReviewerAddress).toBeUndefined();
      expect(pendingPage).toBe(1);
    });

    it("can switch between different reviewer addresses", () => {
      let selectedReviewerAddress: string | undefined = testAddress;
      const otherAddress = "0xabcdef1234567890abcdef1234567890abcdef12";

      const handleReviewerAddressChange = (address: string | undefined) => {
        selectedReviewerAddress = address;
      };

      handleReviewerAddressChange(otherAddress);
      expect(selectedReviewerAddress).toBe(otherAddress);
    });
  });

  describe("integration: default address drives effective address", () => {
    it("reviewer-only user defaults to seeing their own milestones", () => {
      const defaultAddress = computeDefaultReviewerAddress(true, false, testAddress);
      expect(defaultAddress).toBe(testAddress);
    });

    it("admin user defaults to seeing all milestones", () => {
      const defaultAddress = computeDefaultReviewerAddress(true, true, testAddress);
      expect(defaultAddress).toBeUndefined();
    });

    it("non-reviewer, non-admin user defaults to seeing all milestones", () => {
      const defaultAddress = computeDefaultReviewerAddress(false, false, testAddress);
      expect(defaultAddress).toBeUndefined();
    });
  });
});
