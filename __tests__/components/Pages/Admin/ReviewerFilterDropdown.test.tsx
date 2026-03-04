import "@testing-library/jest-dom";
import { getReviewerLabel } from "@/components/Pages/Admin/ReviewerFilterDropdown";
import type { CommunityReviewer } from "@/hooks/useCommunityMilestoneReviewers";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";

/**
 * Tests for ReviewerFilterDropdown helper functions.
 *
 * The component uses Radix Popover + cmdk which require complex DOM setup.
 * We import and test the pure logic functions instead.
 */

function getSelectedLabel(
  selectedAddress: string | undefined,
  reviewers: CommunityReviewer[],
  currentUserAddress?: string
): string {
  if (!selectedAddress) return "All Reviewers";
  const match = reviewers.find(
    (r) => r.publicAddress.toLowerCase() === selectedAddress.toLowerCase()
  );
  if (!match) return formatAddressForDisplay(selectedAddress);
  return getReviewerLabel(match, currentUserAddress);
}

describe("ReviewerFilterDropdown logic", () => {
  describe("formatAddressForDisplay", () => {
    it("truncates long addresses", () => {
      const address = "0x1234567890abcdef1234567890abcdef12345678";
      expect(formatAddressForDisplay(address)).toBe("0x1234...5678");
    });

    it("does not truncate short strings", () => {
      expect(formatAddressForDisplay("0x123456")).toBe("0x123456");
    });
  });

  describe("getReviewerLabel", () => {
    it("returns name when reviewer has a name", () => {
      const reviewer = { publicAddress: "0xABC", name: "Alice", email: "a@test.com" };
      expect(getReviewerLabel(reviewer)).toBe("Alice");
    });

    it("returns truncated address when name is empty", () => {
      const reviewer = {
        publicAddress: "0x1234567890abcdef1234567890abcdef12345678",
        name: "",
        email: "a@test.com",
      };
      expect(getReviewerLabel(reviewer)).toBe("0x1234...5678");
    });

    it('appends "(You)" when reviewer matches current user', () => {
      const reviewer = { publicAddress: "0xABC", name: "Alice", email: "a@test.com" };
      expect(getReviewerLabel(reviewer, "0xabc")).toBe("Alice (You)");
    });

    it('does not append "(You)" for other reviewers', () => {
      const reviewer = { publicAddress: "0xABC", name: "Alice", email: "a@test.com" };
      expect(getReviewerLabel(reviewer, "0xDEF")).toBe("Alice");
    });

    it('does not append "(You)" when currentUserAddress is undefined', () => {
      const reviewer = { publicAddress: "0xABC", name: "Alice", email: "a@test.com" };
      expect(getReviewerLabel(reviewer, undefined)).toBe("Alice");
    });
  });

  describe("getSelectedLabel", () => {
    const reviewers: CommunityReviewer[] = [
      { publicAddress: "0xABC", name: "Alice", email: "a@test.com" },
      { publicAddress: "0xDEF", name: "Bob", email: "b@test.com" },
    ];

    it('returns "All Reviewers" when no address selected', () => {
      expect(getSelectedLabel(undefined, reviewers)).toBe("All Reviewers");
    });

    it("returns reviewer name when address matches", () => {
      expect(getSelectedLabel("0xABC", reviewers)).toBe("Alice");
    });

    it("returns reviewer name case-insensitively", () => {
      expect(getSelectedLabel("0xabc", reviewers)).toBe("Alice");
    });

    it("returns truncated address when no matching reviewer found", () => {
      expect(getSelectedLabel("0x1234567890abcdef1234567890abcdef12345678", reviewers)).toBe(
        "0x1234...5678"
      );
    });

    it('appends "(You)" for current user', () => {
      expect(getSelectedLabel("0xABC", reviewers, "0xabc")).toBe("Alice (You)");
    });
  });
});
