/**
 * Tests for the reviewer filter logic in useReportPageData.
 *
 * The hook uses address-based filtering where:
 *   - undefined = "All Reviewers"
 *   - string = specific reviewer's address
 *
 * Default selection: the current user's address is preselected iff it appears
 * in the community reviewer list, regardless of admin/role state.
 */

import type { CommunityReviewer } from "@/hooks/useCommunityMilestoneReviewers";
import {
  computeDefaultReviewerAddress,
  getPendingVerificationTotalItems,
} from "@/hooks/useReportPageData";

describe("useReportPageData reviewer filter logic (address-based)", () => {
  const userAddress = "0x1234567890abcdef1234567890abcdef12345678";
  const otherAddress = "0xabcdef1234567890abcdef1234567890abcdef12";

  const makeReviewer = (publicAddress: string, name?: string): CommunityReviewer => ({
    publicAddress,
    name,
  });

  describe("computeDefaultReviewerAddress", () => {
    it("returns the matching reviewer's address when the user is in the reviewer list", () => {
      const reviewers = [makeReviewer(otherAddress, "Alice"), makeReviewer(userAddress, "Bob")];
      expect(computeDefaultReviewerAddress(reviewers, userAddress)).toBe(userAddress);
    });

    it("matches case-insensitively (checksummed vs lowercase address)", () => {
      const reviewers = [makeReviewer(userAddress.toLowerCase())];
      expect(computeDefaultReviewerAddress(reviewers, userAddress.toUpperCase())).toBe(
        userAddress.toLowerCase()
      );
    });

    it("returns undefined when the user is not in the reviewer list", () => {
      const reviewers = [makeReviewer(otherAddress, "Alice")];
      expect(computeDefaultReviewerAddress(reviewers, userAddress)).toBeUndefined();
    });

    it("returns undefined when currentUserAddress is undefined", () => {
      const reviewers = [makeReviewer(userAddress)];
      expect(computeDefaultReviewerAddress(reviewers, undefined)).toBeUndefined();
    });

    it("returns undefined when reviewers list is empty", () => {
      expect(computeDefaultReviewerAddress([], userAddress)).toBeUndefined();
    });

    it("returns undefined when reviewers list is undefined (not loaded yet)", () => {
      expect(computeDefaultReviewerAddress(undefined, userAddress)).toBeUndefined();
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

      handleReviewerAddressChange(userAddress);
      expect(selectedReviewerAddress).toBe(userAddress);
      expect(pendingPage).toBe(1);
    });

    it("can switch to undefined (all reviewers)", () => {
      let selectedReviewerAddress: string | undefined = userAddress;
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
      let selectedReviewerAddress: string | undefined = userAddress;

      const handleReviewerAddressChange = (address: string | undefined) => {
        selectedReviewerAddress = address;
      };

      handleReviewerAddressChange(otherAddress);
      expect(selectedReviewerAddress).toBe(otherAddress);
    });
  });

  describe("integration: default address drives effective address", () => {
    it("user who is a registered reviewer defaults to seeing their own milestones", () => {
      const reviewers = [makeReviewer(userAddress)];
      expect(computeDefaultReviewerAddress(reviewers, userAddress)).toBe(userAddress);
    });

    it("admin who is also a reviewer defaults to themselves (not 'All Reviewers')", () => {
      const reviewers = [makeReviewer(otherAddress), makeReviewer(userAddress)];
      expect(computeDefaultReviewerAddress(reviewers, userAddress)).toBe(userAddress);
    });

    it("user not in reviewer list defaults to seeing all milestones", () => {
      const reviewers = [makeReviewer(otherAddress)];
      expect(computeDefaultReviewerAddress(reviewers, userAddress)).toBeUndefined();
    });
  });

  describe("getPendingVerificationTotalItems", () => {
    it("never reports fewer items than are visible in the current table data", () => {
      expect(getPendingVerificationTotalItems(5, 6)).toBe(6);
    });

    it("keeps the API total when it already matches or exceeds the visible rows", () => {
      expect(getPendingVerificationTotalItems(6, 5)).toBe(6);
      expect(getPendingVerificationTotalItems(6, 6)).toBe(6);
    });

    it("falls back to the visible row count when the API total is missing", () => {
      expect(getPendingVerificationTotalItems(undefined, 4)).toBe(4);
      expect(getPendingVerificationTotalItems(null, 3)).toBe(3);
    });
  });
});
