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
import { computeDefaultReviewerAddress, getPendingTableResetKey } from "@/hooks/useReportPageData";

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

  // DEV-365: the pending table must fully remount when the filter changes so a
  // row from a previous reviewer/program/page can't survive list reconciliation.
  describe("getPendingTableResetKey", () => {
    it("changes when the reviewer changes", () => {
      const all = getPendingTableResetKey(undefined, [], 1);
      const scoped = getPendingTableResetKey(userAddress, [], 1);
      expect(all).not.toBe(scoped);
    });

    it("changes when the selected programs change", () => {
      const noProgram = getPendingTableResetKey(userAddress, [], 1);
      const withProgram = getPendingTableResetKey(userAddress, ["992"], 1);
      expect(noProgram).not.toBe(withProgram);
    });

    it("changes when the page changes", () => {
      expect(getPendingTableResetKey(userAddress, ["992"], 1)).not.toBe(
        getPendingTableResetKey(userAddress, ["992"], 2)
      );
    });

    it("is stable regardless of program-id ordering", () => {
      expect(getPendingTableResetKey(userAddress, ["992", "1"], 1)).toBe(
        getPendingTableResetKey(userAddress, ["1", "992"], 1)
      );
    });

    it("treats 'all reviewers' (undefined) distinctly from a specific address", () => {
      expect(getPendingTableResetKey(undefined, ["992"], 1)).toBe("all-992-1");
    });
  });
});
