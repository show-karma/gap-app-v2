import { formatMilestoneAmount } from "@/utilities/formatMilestoneAmount";

describe("formatMilestoneAmount", () => {
  describe("pure numeric amounts without currency param", () => {
    it("should_return_dollar_prefix_when_amount_is_pure_number_and_no_currency_given", () => {
      expect(formatMilestoneAmount("5000")).toBe("$5,000");
    });

    it("should_return_null_when_amount_is_zero", () => {
      expect(formatMilestoneAmount("0")).toBeNull();
    });

    it("should_return_null_when_amount_is_empty", () => {
      expect(formatMilestoneAmount("")).toBeNull();
    });

    it("should_return_null_when_amount_is_undefined", () => {
      expect(formatMilestoneAmount(undefined)).toBeNull();
    });
  });

  describe("pure numeric amounts with currency param", () => {
    it("should_append_currency_token_when_currency_is_provided_for_pure_number", () => {
      expect(formatMilestoneAmount("30000", "OP")).toBe("30,000 OP");
    });

    it("should_append_usdc_when_currency_is_usdc", () => {
      expect(formatMilestoneAmount("10000", "USDC")).toBe("10,000 USDC");
    });

    it("should_not_add_dollar_prefix_when_currency_is_provided", () => {
      const result = formatMilestoneAmount("5000", "ETH");
      expect(result).toBe("5,000 ETH");
      expect(result).not.toMatch(/^\$/);
    });

    it("should_return_null_when_amount_is_zero_regardless_of_currency", () => {
      expect(formatMilestoneAmount("0", "OP")).toBeNull();
    });
  });

  describe("amounts with embedded token suffix", () => {
    it("should_format_numeric_part_and_preserve_token_suffix", () => {
      expect(formatMilestoneAmount("30000 OP")).toBe("30,000 OP");
    });

    it("should_ignore_currency_param_when_amount_already_has_token_suffix", () => {
      // Amount already has token embedded — currency param is ignored
      expect(formatMilestoneAmount("30000 OP", "USDC")).toBe("30,000 OP");
    });
  });

  describe("pass-through amounts", () => {
    it("should_return_as_is_when_amount_has_dollar_sign", () => {
      expect(formatMilestoneAmount("$5,000 USD")).toBe("$5,000 USD");
    });
  });
});
