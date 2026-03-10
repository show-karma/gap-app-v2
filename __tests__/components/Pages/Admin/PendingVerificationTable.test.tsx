/**
 * Tests for PendingVerificationTable empty state logic.
 */

import { getEmptyStateMessage } from "@/components/Pages/Admin/PendingVerificationTable";

describe("PendingVerificationTable empty state", () => {
  const userAddress = "0x1234567890abcdef1234567890abcdef12345678";
  const otherAddress = "0xabcdef1234567890abcdef1234567890abcdef12";

  describe("getEmptyStateMessage", () => {
    it("returns personal message when viewing own milestones", () => {
      expect(getEmptyStateMessage(userAddress, userAddress)).toBe(
        "All your assigned milestones are verified"
      );
    });

    it("is case-insensitive for address comparison", () => {
      expect(getEmptyStateMessage(userAddress.toUpperCase(), userAddress.toLowerCase())).toBe(
        "All your assigned milestones are verified"
      );
    });

    it("returns reviewer-specific message when viewing another reviewer", () => {
      expect(getEmptyStateMessage(otherAddress, userAddress)).toBe(
        "All milestones assigned to this reviewer are verified"
      );
    });

    it("returns reviewer-specific message when no current user address", () => {
      expect(getEmptyStateMessage(otherAddress, undefined)).toBe(
        "All milestones assigned to this reviewer are verified"
      );
    });

    it("returns generic message when no filter (all reviewers)", () => {
      expect(getEmptyStateMessage(undefined, userAddress)).toBe("All milestones are verified");
    });

    it("returns generic message when both are undefined", () => {
      expect(getEmptyStateMessage(undefined, undefined)).toBe("All milestones are verified");
    });
  });
});
