import {
  parseReviewerMemberId,
  sanitizeString,
  validateChainId,
  validateEmail,
  validateProgramId,
  validateProgramIdentifier,
  validateProgramIdentifiers,
  validateReviewerData,
  validateTelegram,
  validateWalletAddress,
} from "../validators";

describe("validators", () => {
  describe("validateWalletAddress", () => {
    it("should validate correct Ethereum addresses", () => {
      expect(validateWalletAddress("0x1234567890123456789012345678901234567890")).toBe(true);
      // Fixed: address must be exactly 40 hex characters (42 total with 0x)
      expect(validateWalletAddress("0xabcdefABCDEF0123456789012345678912abcdef")).toBe(true);
      expect(validateWalletAddress("0x0000000000000000000000000000000000000000")).toBe(true);
    });

    it("should reject invalid addresses", () => {
      expect(validateWalletAddress("1234567890123456789012345678901234567890")).toBe(false); // Missing 0x
      expect(validateWalletAddress("0x123")).toBe(false); // Too short
      expect(validateWalletAddress("0x12345678901234567890123456789012345678901")).toBe(false); // Too long
      expect(validateWalletAddress("0xGHIJKLMNOP123456789012345678901234567890")).toBe(false); // Invalid hex
    });

    it("should handle edge cases", () => {
      expect(validateWalletAddress("")).toBe(false);
      expect(validateWalletAddress(null as any)).toBe(false);
      expect(validateWalletAddress(undefined as any)).toBe(false);
      expect(validateWalletAddress(123 as any)).toBe(false);
    });

    it("should trim whitespace before validation", () => {
      expect(validateWalletAddress("  0x1234567890123456789012345678901234567890  ")).toBe(true);
      expect(validateWalletAddress("\n0x1234567890123456789012345678901234567890\n")).toBe(true);
    });
  });

  describe("validateEmail", () => {
    it("should validate correct email addresses", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@example.co.uk")).toBe(true);
      expect(validateEmail("user+tag@example.com")).toBe(true);
      expect(validateEmail("123@test.org")).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("invalid@")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("test@example")).toBe(false);
      expect(validateEmail("test @example.com")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(validateEmail("")).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
      expect(validateEmail(123 as any)).toBe(false);
    });

    it("should trim whitespace before validation", () => {
      expect(validateEmail("  test@example.com  ")).toBe(true);
    });
  });

  describe("validateTelegram", () => {
    it("should validate correct Telegram handles", () => {
      expect(validateTelegram("username")).toBe(true);
      expect(validateTelegram("@username")).toBe(true);
      expect(validateTelegram("user_name")).toBe(true);
      expect(validateTelegram("@user123")).toBe(true);
      expect(validateTelegram("a".repeat(32))).toBe(true); // Max length
    });

    it("should reject invalid Telegram handles", () => {
      expect(validateTelegram("ab")).toBe(false); // Too short
      expect(validateTelegram("abcd")).toBe(false); // Too short (4 chars)
      expect(validateTelegram("a".repeat(33))).toBe(false); // Too long
      expect(validateTelegram("@user-name")).toBe(false); // Invalid character (-)
      expect(validateTelegram("@user.name")).toBe(false); // Invalid character (.)
      expect(validateTelegram("user name")).toBe(false); // Space
    });

    it("should handle edge cases", () => {
      expect(validateTelegram("")).toBe(false);
      expect(validateTelegram(null as any)).toBe(false);
      expect(validateTelegram(undefined as any)).toBe(false);
    });

    it("should trim whitespace before validation", () => {
      expect(validateTelegram("  username  ")).toBe(true);
      expect(validateTelegram("  @username  ")).toBe(true);
    });

    it("should validate exactly 5 characters (minimum)", () => {
      expect(validateTelegram("abcde")).toBe(true);
      expect(validateTelegram("@abcde")).toBe(true); // @ + 5 chars = 6 total (5 alphanumeric minimum)
    });
  });

  describe("validateProgramId", () => {
    it("should validate correct program IDs", () => {
      expect(validateProgramId("program-123")).toBe(true);
      expect(validateProgramId("program_456")).toBe(true);
      expect(validateProgramId("abc123")).toBe(true);
      expect(validateProgramId("0x1234567890abcdef")).toBe(true);
    });

    it("should reject invalid program IDs", () => {
      expect(validateProgramId("")).toBe(false);
      expect(validateProgramId("program id")).toBe(false); // Space
      expect(validateProgramId("program.id")).toBe(false); // Dot
      expect(validateProgramId("program@id")).toBe(false); // Special char
    });

    it("should handle edge cases", () => {
      expect(validateProgramId(null as any)).toBe(false);
      expect(validateProgramId(undefined as any)).toBe(false);
      expect(validateProgramId(123 as any)).toBe(false);
    });

    it("should trim whitespace before validation", () => {
      expect(validateProgramId("  program-123  ")).toBe(true);
    });
  });

  describe("validateChainId", () => {
    it("should validate correct chain IDs as numbers", () => {
      expect(validateChainId(1)).toBe(true);
      expect(validateChainId(10)).toBe(true);
      expect(validateChainId(42161)).toBe(true); // Arbitrum
      expect(validateChainId(137)).toBe(true); // Polygon
    });

    it("should validate correct chain IDs as strings", () => {
      expect(validateChainId("1")).toBe(true);
      expect(validateChainId("10")).toBe(true);
      expect(validateChainId("42161")).toBe(true);
    });

    it("should reject invalid chain IDs", () => {
      expect(validateChainId(0)).toBe(false);
      expect(validateChainId(-1)).toBe(false);
      expect(validateChainId(1.5)).toBe(false);
      expect(validateChainId("0")).toBe(false);
      expect(validateChainId("-1")).toBe(false);
      expect(validateChainId("abc")).toBe(false);
      expect(validateChainId("1.5")).toBe(false);
      // String '1 ' trims to '1' and is valid
      expect(validateChainId("  invalid  ")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(validateChainId(null as any)).toBe(false);
      expect(validateChainId(undefined as any)).toBe(false);
      expect(validateChainId("" as any)).toBe(false);
    });
  });

  describe("validateProgramIdentifier", () => {
    it("should validate correct program identifiers", () => {
      const result = validateProgramIdentifier("program-123_1");
      expect(result.valid).toBe(true);
      expect(result.programId).toBe("program-123");
      expect(result.chainID).toBe(1);
    });

    it("should validate identifiers with different chain IDs", () => {
      const result = validateProgramIdentifier("abc_42161");
      expect(result.valid).toBe(true);
      expect(result.programId).toBe("abc");
      expect(result.chainID).toBe(42161);
    });

    it("should validate normalized format (programId only)", () => {
      const result = validateProgramIdentifier("program-123");
      expect(result.valid).toBe(true);
      expect(result.programId).toBe("program-123");
      expect(result.chainID).toBeUndefined();
    });

    it("should reject invalid formats", () => {
      expect(validateProgramIdentifier("program-123_").valid).toBe(false); // Has underscore but no chainID
      expect(validateProgramIdentifier("_1").valid).toBe(false); // Empty programId
      expect(validateProgramIdentifier("program-123_1_extra").valid).toBe(false); // Too many underscores
      expect(validateProgramIdentifier("program id_1").valid).toBe(false); // Space in programId
    });

    it("should reject invalid program IDs", () => {
      const result = validateProgramIdentifier("program id_1");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("program ID");
    });

    it("should reject invalid chain IDs", () => {
      const result = validateProgramIdentifier("program-123_0");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("chain ID");
    });

    it("should handle edge cases", () => {
      expect(validateProgramIdentifier("").valid).toBe(false);
      expect(validateProgramIdentifier(null as any).valid).toBe(false);
      expect(validateProgramIdentifier(undefined as any).valid).toBe(false);
    });
  });

  describe("validateProgramIdentifiers", () => {
    it("should validate multiple correct identifiers", () => {
      const result = validateProgramIdentifiers(["program-1_1", "program-2_42161"]);
      expect(result.valid).toBe(true);
      expect(result.validIds).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle mixed valid and invalid identifiers", () => {
      // "program id" has a space which makes it invalid
      const result = validateProgramIdentifiers(["program-1_1", "program id", "program-2_42161"]);
      expect(result.valid).toBe(false);
      expect(result.validIds).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].id).toBe("program id");
    });

    it("should accept normalized format identifiers (programId only)", () => {
      const result = validateProgramIdentifiers(["program-1", "program-2", "program-3_42161"]);
      expect(result.valid).toBe(true);
      expect(result.validIds).toHaveLength(3);
      expect(result.validIds[0].chainID).toBeUndefined(); // Normalized format
      expect(result.validIds[1].chainID).toBeUndefined(); // Normalized format
      expect(result.validIds[2].chainID).toBe(42161); // Composite format
    });

    it("should reject non-array input", () => {
      const result = validateProgramIdentifiers("not-an-array" as any);
      expect(result.valid).toBe(false);
      expect(result.errors[0].error).toContain("array");
    });

    it("should handle empty array", () => {
      const result = validateProgramIdentifiers([]);
      expect(result.valid).toBe(true);
      expect(result.validIds).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("parseReviewerMemberId", () => {
    it("should parse program reviewer member ID", () => {
      const result = parseReviewerMemberId("program-0x1234567890123456789012345678901234567890");
      expect(result.valid).toBe(true);
      expect(result.role).toBe("program");
      expect(result.publicAddress).toBe("0x1234567890123456789012345678901234567890");
    });

    it("should parse milestone reviewer member ID", () => {
      const result = parseReviewerMemberId("milestone-0x1234567890123456789012345678901234567890");
      expect(result.valid).toBe(true);
      expect(result.role).toBe("milestone");
      expect(result.publicAddress).toBe("0x1234567890123456789012345678901234567890");
    });

    it("should reject invalid role", () => {
      const result = parseReviewerMemberId("invalid-0x1234567890123456789012345678901234567890");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid role");
    });

    it("should reject missing hyphen", () => {
      const result = parseReviewerMemberId("program0x1234567890123456789012345678901234567890");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("format");
    });

    it("should reject invalid wallet address", () => {
      const result = parseReviewerMemberId("program-invalid-address");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("wallet address");
    });

    it("should handle edge cases", () => {
      expect(parseReviewerMemberId("").valid).toBe(false);
      expect(parseReviewerMemberId(null as any).valid).toBe(false);
      expect(parseReviewerMemberId(undefined as any).valid).toBe(false);
    });
  });

  describe("sanitizeString", () => {
    it("should remove HTML tags", () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeString("<b>bold text</b>")).toBe("bold text");
      expect(sanitizeString("<div>content</div>")).toBe("content");
    });

    it("should trim whitespace", () => {
      expect(sanitizeString("  text  ")).toBe("text");
      expect(sanitizeString("\n\ntext\n\n")).toBe("text");
    });

    it("should handle complex HTML", () => {
      expect(sanitizeString('<div class="test">content <span>nested</span></div>')).toBe(
        "content nested"
      );
    });

    it("should handle edge cases", () => {
      expect(sanitizeString("")).toBe("");
      expect(sanitizeString(null as any)).toBe("");
      expect(sanitizeString(undefined as any)).toBe("");
      expect(sanitizeString(123 as any)).toBe("");
    });

    it("should preserve text without HTML", () => {
      expect(sanitizeString("plain text")).toBe("plain text");
      expect(sanitizeString("text with & special chars")).toBe("text with & special chars");
    });
  });

  describe("validateReviewerData", () => {
    it("should validate correct reviewer data", () => {
      const result = validateReviewerData({
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "John Doe",
        email: "john@example.com",
        telegram: "@johndoe",
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate data without telegram", () => {
      const result = validateReviewerData({
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "John Doe",
        email: "john@example.com",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing required fields", () => {
      const result = validateReviewerData({
        publicAddress: "",
        name: "",
        email: "",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });

    it("should reject invalid wallet address", () => {
      const result = validateReviewerData({
        publicAddress: "invalid",
        name: "John Doe",
        email: "john@example.com",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid wallet address format");
    });

    it("should reject name that is too short", () => {
      const result = validateReviewerData({
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "J",
        email: "john@example.com",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("at least 2 characters"))).toBe(true);
    });

    it("should reject name that is too long", () => {
      const result = validateReviewerData({
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "A".repeat(101),
        email: "john@example.com",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("less than 100 characters"))).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = validateReviewerData({
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "John Doe",
        email: "invalid-email",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid email format");
    });

    it("should reject invalid telegram handle", () => {
      const result = validateReviewerData({
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "John Doe",
        email: "john@example.com",
        telegram: "ab",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Telegram"))).toBe(true);
    });

    it("should accept name with whitespace trimmed to valid length", () => {
      const result = validateReviewerData({
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "  John Doe  ",
        email: "john@example.com",
      });
      expect(result.valid).toBe(true);
    });
  });
});
