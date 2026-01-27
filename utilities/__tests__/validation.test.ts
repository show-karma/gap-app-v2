import { isValidProjectUid, PROJECT_UID_REGEX, sanitizeNumericInput } from "../validation";

describe("validation utilities", () => {
  describe("PROJECT_UID_REGEX", () => {
    it("should match valid 66-character hex UIDs starting with 0x", () => {
      const validUID = "0x" + "a".repeat(64);
      expect(PROJECT_UID_REGEX.test(validUID)).toBe(true);
    });

    it("should match UIDs with mixed case hex characters", () => {
      const validUID = "0xaBcDeF0123456789" + "a".repeat(48);
      expect(PROJECT_UID_REGEX.test(validUID)).toBe(true);
    });

    it("should not match UIDs without 0x prefix", () => {
      const invalidUID = "a".repeat(64);
      expect(PROJECT_UID_REGEX.test(invalidUID)).toBe(false);
    });

    it("should not match UIDs with incorrect length", () => {
      const shortUID = "0x" + "a".repeat(63);
      const longUID = "0x" + "a".repeat(65);
      expect(PROJECT_UID_REGEX.test(shortUID)).toBe(false);
      expect(PROJECT_UID_REGEX.test(longUID)).toBe(false);
    });

    it("should not match UIDs with non-hex characters", () => {
      const invalidUID = "0x" + "g".repeat(64);
      expect(PROJECT_UID_REGEX.test(invalidUID)).toBe(false);
    });
  });

  describe("isValidProjectUid", () => {
    it("should return true for valid project UIDs", () => {
      const validUID = "0x" + "a".repeat(64);
      expect(isValidProjectUid(validUID)).toBe(true);
    });

    it("should return false for non-string values", () => {
      expect(isValidProjectUid(null)).toBe(false);
      expect(isValidProjectUid(undefined)).toBe(false);
      expect(isValidProjectUid(123)).toBe(false);
      expect(isValidProjectUid({})).toBe(false);
      expect(isValidProjectUid([])).toBe(false);
    });

    it("should return false for invalid string UIDs", () => {
      expect(isValidProjectUid("invalid")).toBe(false);
      expect(isValidProjectUid("0x")).toBe(false);
      expect(isValidProjectUid("")).toBe(false);
    });
  });

  describe("sanitizeNumericInput", () => {
    describe("basic functionality", () => {
      it("should allow valid numeric input with decimal point", () => {
        expect(sanitizeNumericInput("123.45")).toBe("123.45");
      });

      it("should allow integers", () => {
        expect(sanitizeNumericInput("12345")).toBe("12345");
      });

      it("should allow decimal point at the beginning", () => {
        expect(sanitizeNumericInput(".5")).toBe(".5");
      });

      it("should allow decimal point at the end", () => {
        expect(sanitizeNumericInput("5.")).toBe("5.");
      });

      it("should return empty string for empty input", () => {
        expect(sanitizeNumericInput("")).toBe("");
      });
    });

    describe("removing invalid characters", () => {
      it("should remove letters from input", () => {
        expect(sanitizeNumericInput("abc123def")).toBe("123");
      });

      it("should remove special characters", () => {
        expect(sanitizeNumericInput("!@#$%^&*()")).toBe("");
      });

      it("should remove commas (number formatting)", () => {
        expect(sanitizeNumericInput("1,234.56")).toBe("1234.56");
      });

      it("should remove spaces", () => {
        expect(sanitizeNumericInput("1 234 567")).toBe("1234567");
      });

      it("should remove currency symbols", () => {
        expect(sanitizeNumericInput("$100.00")).toBe("100.00");
      });

      it("should remove plus and minus signs", () => {
        expect(sanitizeNumericInput("+123")).toBe("123");
        expect(sanitizeNumericInput("-456")).toBe("456");
      });
    });

    describe("handling multiple decimal points", () => {
      it("should keep only the first decimal point", () => {
        expect(sanitizeNumericInput("12.34.56")).toBe("12.3456");
      });

      it("should handle multiple consecutive decimal points", () => {
        expect(sanitizeNumericInput("12...34")).toBe("12.34");
      });

      it("should handle decimal points at start and end", () => {
        expect(sanitizeNumericInput(".12.")).toBe(".12");
      });

      it("should handle many decimal points", () => {
        expect(sanitizeNumericInput("1.2.3.4.5")).toBe("1.2345");
      });
    });

    describe("edge cases", () => {
      it("should handle only decimal point", () => {
        expect(sanitizeNumericInput(".")).toBe(".");
      });

      it("should handle multiple decimal points only", () => {
        expect(sanitizeNumericInput("...")).toBe(".");
      });

      it("should handle mixed valid and invalid characters", () => {
        expect(sanitizeNumericInput("abc1.2def3.4ghi")).toBe("1.234");
      });

      it("should handle very long numbers", () => {
        const longNumber = "1234567890".repeat(10);
        expect(sanitizeNumericInput(longNumber)).toBe(longNumber);
      });

      it("should handle scientific notation input as plain numbers (removes e)", () => {
        expect(sanitizeNumericInput("1e10")).toBe("110");
      });

      it("should handle zero values", () => {
        expect(sanitizeNumericInput("0")).toBe("0");
        expect(sanitizeNumericInput("0.0")).toBe("0.0");
        expect(sanitizeNumericInput("0.00")).toBe("0.00");
      });

      it("should handle leading zeros", () => {
        expect(sanitizeNumericInput("007")).toBe("007");
        expect(sanitizeNumericInput("00.07")).toBe("00.07");
      });
    });

    describe("real-world use cases", () => {
      it("should handle pasting a formatted currency value", () => {
        expect(sanitizeNumericInput("$1,234,567.89")).toBe("1234567.89");
      });

      it("should handle cryptocurrency amounts with high precision", () => {
        expect(sanitizeNumericInput("0.000000000000000001")).toBe("0.000000000000000001");
      });

      it("should handle user typing letters by mistake", () => {
        expect(sanitizeNumericInput("100o")).toBe("100");
        expect(sanitizeNumericInput("l00")).toBe("00");
      });

      it("should handle copying from Excel or spreadsheet", () => {
        expect(sanitizeNumericInput("\t1234.56\t")).toBe("1234.56");
      });
    });
  });
});
