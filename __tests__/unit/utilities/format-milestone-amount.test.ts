import { formatMilestoneAmount } from "@/utilities/formatMilestoneAmount";

describe("formatMilestoneAmount", () => {
  describe("returns null for falsy/zero amounts", () => {
    it("returns null for undefined", () => {
      expect(formatMilestoneAmount(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(formatMilestoneAmount("")).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
      expect(formatMilestoneAmount("   ")).toBeNull();
    });

    it("returns null for '0'", () => {
      expect(formatMilestoneAmount("0")).toBeNull();
    });

    it("returns null for '0.00'", () => {
      expect(formatMilestoneAmount("0.00")).toBeNull();
    });
  });

  describe("formats numeric amounts with comma separators", () => {
    it("formats a plain number string", () => {
      expect(formatMilestoneAmount("5000")).toBe("5,000");
    });

    it("formats a large number", () => {
      expect(formatMilestoneAmount("1000000")).toBe("1,000,000");
    });

    it("formats a decimal number", () => {
      expect(formatMilestoneAmount("5000.50")).toBe("5,000.5");
    });

    it("preserves small decimal amounts", () => {
      expect(formatMilestoneAmount("0.5")).toBe("0.5");
    });
  });

  describe("handles already-formatted or prefixed amounts", () => {
    it("returns the original string for dollar-prefixed amount", () => {
      expect(formatMilestoneAmount("$5,000 USD")).toBe("$5,000 USD");
    });

    it("returns the original string for amounts with currency suffix", () => {
      expect(formatMilestoneAmount("5000 FIL")).toBe("5,000 FIL");
    });

    it("returns the original string when it contains non-numeric chars other than commas/dots", () => {
      expect(formatMilestoneAmount("~5000")).toBe("~5000");
    });

    it("handles amount that already has commas", () => {
      expect(formatMilestoneAmount("5,000")).toBe("5,000");
    });
  });

  describe("handles edge cases", () => {
    it("handles negative amounts", () => {
      // Negative amounts are unusual but should not crash
      expect(formatMilestoneAmount("-100")).toBe("-100");
    });

    it("handles very small amounts", () => {
      expect(formatMilestoneAmount("0.001")).toBe("0.001");
    });

    it("trims whitespace before processing", () => {
      expect(formatMilestoneAmount(" 5000 ")).toBe("5,000");
    });
  });
});
