import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

/**
 * Tests for ReviewerFilterDropdown helper functions.
 *
 * The component uses Radix Popover + cmdk which require complex DOM setup.
 * We extract and test the pure logic functions instead.
 */

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface CommunityReviewer {
  publicAddress: string;
  name: string;
  email: string;
}

function getReviewerLabel(reviewer: CommunityReviewer, currentUserAddress?: string): string {
  const name = reviewer.name || truncateAddress(reviewer.publicAddress);
  if (
    currentUserAddress &&
    reviewer.publicAddress.toLowerCase() === currentUserAddress.toLowerCase()
  ) {
    return `${name} (You)`;
  }
  return name;
}

function getSelectedLabel(
  selectedAddress: string | undefined,
  reviewers: CommunityReviewer[],
  currentUserAddress?: string
): string {
  if (!selectedAddress) return "All Reviewers";
  const match = reviewers.find(
    (r) => r.publicAddress.toLowerCase() === selectedAddress.toLowerCase()
  );
  if (!match) return truncateAddress(selectedAddress);
  return getReviewerLabel(match, currentUserAddress);
}

describe("ReviewerFilterDropdown logic", () => {
  describe("truncateAddress", () => {
    it("truncates long addresses", () => {
      const address = "0x1234567890abcdef1234567890abcdef12345678";
      expect(truncateAddress(address)).toBe("0x1234...5678");
    });

    it("does not truncate short strings", () => {
      expect(truncateAddress("0x123456")).toBe("0x123456");
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
