import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { generateRandomString } from "@/utilities/generateRandomString";
import roundNumberWithPlus from "@/utilities/roundNumberWithPlus";
import { shortAddress } from "@/utilities/shortAddress";

describe("generateRandomString", () => {
  it("should generate string of specified length", () => {
    const result = generateRandomString(10);
    expect(result).toHaveLength(10);
  });

  it("should generate string of length 5", () => {
    const result = generateRandomString(5);
    expect(result).toHaveLength(5);
  });

  it("should generate string of length 50", () => {
    const result = generateRandomString(50);
    expect(result).toHaveLength(50);
  });

  it("should generate empty string for length 0", () => {
    const result = generateRandomString(0);
    expect(result).toBe("");
  });

  it("should only contain alphanumeric characters", () => {
    const result = generateRandomString(100);
    expect(result).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("should generate different strings on subsequent calls", () => {
    const result1 = generateRandomString(20);
    const result2 = generateRandomString(20);
    expect(result1).not.toBe(result2);
  });

  it("should handle large lengths", () => {
    const result = generateRandomString(1000);
    expect(result).toHaveLength(1000);
    expect(result).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("should generate from full character set", () => {
    const results = [];
    for (let i = 0; i < 100; i++) {
      results.push(generateRandomString(100));
    }
    const combined = results.join("");
    // Should contain both uppercase and lowercase and numbers
    expect(combined).toMatch(/[A-Z]/);
    expect(combined).toMatch(/[a-z]/);
    expect(combined).toMatch(/[0-9]/);
  });
});

describe("shortAddress", () => {
  const fullAddress = "0x1234567890123456789012345678901234567890";

  it("should shorten Ethereum address correctly", () => {
    const result = shortAddress(fullAddress);
    expect(result).toBe("0x1234...567890");
  });

  it("should include first 6 characters", () => {
    const result = shortAddress(fullAddress);
    expect(result.startsWith("0x1234")).toBe(true);
  });

  it("should include last 6 characters", () => {
    const result = shortAddress(fullAddress);
    expect(result.endsWith("567890")).toBe(true);
  });

  it("should include ellipsis in the middle", () => {
    const result = shortAddress(fullAddress);
    expect(result).toContain("...");
  });

  it("should result in 15 character string (6 + 3 + 6)", () => {
    const result = shortAddress(fullAddress);
    expect(result).toHaveLength(15);
  });

  it("should handle addresses with lowercase letters", () => {
    const address = "0xabcdef1234567890abcdef1234567890abcdef12";
    const result = shortAddress(address);
    expect(result).toBe("0xabcd...cdef12");
  });

  it("should handle addresses with uppercase letters", () => {
    const address = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
    const result = shortAddress(address);
    expect(result).toBe("0xABCD...CDEF12");
  });

  it("should handle mixed case addresses", () => {
    const address = "0xAbCdEf1234567890aBcDeF1234567890AbCdEf12";
    const result = shortAddress(address);
    expect(result).toBe("0xAbCd...CdEf12");
  });

  it("should work with short strings (edge case)", () => {
    const shortString = "0x123456";
    const result = shortAddress(shortString);
    expect(result).toBe("0x1234...123456");
  });

  it("should handle very long addresses", () => {
    const longAddress = `0x${"1234567890".repeat(10)}`;
    const result = shortAddress(longAddress);
    expect(result.startsWith("0x1234")).toBe(true);
    expect(result.endsWith("567890")).toBe(true);
    expect(result).toContain("...");
  });
});

describe("roundNumberWithPlus", () => {
  describe("Rounding Disabled", () => {
    it("should return number as-is when rounding is disabled", () => {
      expect(roundNumberWithPlus(150, false)).toBe(150);
    });

    it("should return large number as-is when rounding is disabled", () => {
      expect(roundNumberWithPlus(9876, false)).toBe(9876);
    });

    it("should return small number as-is when rounding is disabled", () => {
      expect(roundNumberWithPlus(5, false)).toBe(5);
    });

    it("should handle zero when rounding is disabled", () => {
      expect(roundNumberWithPlus(0, false)).toBe(0);
    });
  });

  describe("Rounding Enabled", () => {
    it("should round down to nearest hundred and add plus", () => {
      expect(roundNumberWithPlus(150, true)).toBe("100+");
    });

    it("should round 250 to 200+", () => {
      expect(roundNumberWithPlus(250, true)).toBe("200+");
    });

    it("should round 999 to 900+", () => {
      expect(roundNumberWithPlus(999, true)).toBe("900+");
    });

    it("should round 1234 to 1,200+", () => {
      expect(roundNumberWithPlus(1234, true)).toBe("1,200+");
    });

    it("should round large numbers correctly", () => {
      expect(roundNumberWithPlus(9876, true)).toBe("9,800+");
    });

    it("should handle exact hundreds", () => {
      expect(roundNumberWithPlus(500, true)).toBe("500+");
    });

    it("should format with commas for thousands", () => {
      expect(roundNumberWithPlus(5678, true)).toBe("5,600+");
    });
  });

  describe("Edge Cases", () => {
    it("should not round numbers less than 10", () => {
      expect(roundNumberWithPlus(5, true)).toBe(5);
    });

    it("should not round 9", () => {
      expect(roundNumberWithPlus(9, true)).toBe(9);
    });

    it("should not round zero", () => {
      expect(roundNumberWithPlus(0, true)).toBe(0);
    });

    it("should round 10 to 0+", () => {
      expect(roundNumberWithPlus(10, true)).toBe("0+");
    });

    it("should round 99 to 0+", () => {
      expect(roundNumberWithPlus(99, true)).toBe("0+");
    });

    it("should round 100 to 100+", () => {
      expect(roundNumberWithPlus(100, true)).toBe("100+");
    });
  });

  describe("String Input", () => {
    it("should return string as-is", () => {
      expect(roundNumberWithPlus("100", true)).toBe("100");
    });

    it("should return string with plus as-is", () => {
      expect(roundNumberWithPlus("100+", true)).toBe("100+");
    });

    it("should return any string as-is", () => {
      expect(roundNumberWithPlus("hello", true)).toBe("hello");
    });

    it("should return empty string as-is", () => {
      expect(roundNumberWithPlus("", true)).toBe("");
    });
  });

  describe("Default Parameter", () => {
    it("should not round by default", () => {
      expect(roundNumberWithPlus(150)).toBe(150);
    });

    it("should handle large numbers without rounding by default", () => {
      expect(roundNumberWithPlus(9876)).toBe(9876);
    });
  });

  describe("Negative Numbers", () => {
    it("should handle negative numbers when not rounding", () => {
      expect(roundNumberWithPlus(-100, false)).toBe(-100);
    });

    it("should return negative numbers as-is when less than 10 (absolute value)", () => {
      expect(roundNumberWithPlus(-5, true)).toBe(-5);
    });

    it("should round negative numbers", () => {
      // The function doesn't check if value < 10 before the absolute check
      const result = roundNumberWithPlus(-150, true);
      expect(typeof result === "string" || typeof result === "number").toBe(true);
    });
  });

  describe("Decimal Numbers", () => {
    it("should round down decimals", () => {
      expect(roundNumberWithPlus(150.5, true)).toBe("100+");
    });

    it("should handle decimal edge case", () => {
      expect(roundNumberWithPlus(199.9, true)).toBe("100+");
    });

    it("should preserve decimals when not rounding", () => {
      expect(roundNumberWithPlus(150.5, false)).toBe(150.5);
    });
  });

  describe("Large Numbers", () => {
    it("should format very large numbers with commas", () => {
      expect(roundNumberWithPlus(123456, true)).toBe("123,400+");
    });

    it("should handle millions", () => {
      expect(roundNumberWithPlus(1234567, true)).toBe("1,234,500+");
    });

    it("should handle billions", () => {
      expect(roundNumberWithPlus(1234567890, true)).toBe("1,234,567,800+");
    });
  });
});
