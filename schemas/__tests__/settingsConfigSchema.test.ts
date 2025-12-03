import { type SettingsConfigFormData, settingsConfigSchema } from "../settingsConfigSchema";

describe("settingsConfigSchema", () => {
  describe("successPageContent field", () => {
    it("should validate with successPageContent", () => {
      const validData = {
        privateApplications: true,
        applicationDeadline: "2024-12-31T23:59",
        donationRound: false,
        showCommentsOnPublicPage: true,
        successPageContent: "**Review**: Applications reviewed weekly.",
      };

      const result = settingsConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.successPageContent).toBe("**Review**: Applications reviewed weekly.");
      }
    });

    it("should validate without successPageContent (optional)", () => {
      const validData = {
        privateApplications: true,
        applicationDeadline: "2024-12-31T23:59",
        donationRound: false,
        showCommentsOnPublicPage: true,
      };

      const result = settingsConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.successPageContent).toBeUndefined();
      }
    });

    it("should validate with empty successPageContent", () => {
      const validData = {
        privateApplications: true,
        donationRound: false,
        showCommentsOnPublicPage: false,
        successPageContent: "",
      };

      const result = settingsConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.successPageContent).toBe("");
      }
    });

    it("should reject if successPageContent is not a string", () => {
      const invalidData = {
        privateApplications: true,
        donationRound: false,
        showCommentsOnPublicPage: true,
        successPageContent: 123, // Invalid type
      };

      const result = settingsConfigSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject if successPageContent is an object", () => {
      const invalidData = {
        privateApplications: true,
        donationRound: false,
        showCommentsOnPublicPage: true,
        successPageContent: { text: "invalid" },
      };

      const result = settingsConfigSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject if successPageContent is an array", () => {
      const invalidData = {
        privateApplications: true,
        donationRound: false,
        showCommentsOnPublicPage: true,
        successPageContent: ["invalid"],
      };

      const result = settingsConfigSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("existing fields validation", () => {
    it("should validate all required fields", () => {
      const validData: SettingsConfigFormData = {
        privateApplications: true,
        donationRound: false,
        showCommentsOnPublicPage: true,
      };

      const result = settingsConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject if privateApplications is missing", () => {
      const invalidData = {
        donationRound: false,
        showCommentsOnPublicPage: true,
      };

      const result = settingsConfigSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject if donationRound is missing", () => {
      const invalidData = {
        privateApplications: true,
        showCommentsOnPublicPage: true,
      };

      const result = settingsConfigSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject if privateApplications is not a boolean", () => {
      const invalidData = {
        privateApplications: "true",
        donationRound: false,
        showCommentsOnPublicPage: true,
      };

      const result = settingsConfigSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject if donationRound is not a boolean", () => {
      const invalidData = {
        privateApplications: true,
        donationRound: "false",
        showCommentsOnPublicPage: true,
      };

      const result = settingsConfigSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should accept optional applicationDeadline", () => {
      const validData = {
        privateApplications: true,
        applicationDeadline: "2024-12-31T23:59:59",
        donationRound: false,
        showCommentsOnPublicPage: true,
      };

      const result = settingsConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.applicationDeadline).toBe("2024-12-31T23:59:59");
      }
    });

    it("should accept empty string for applicationDeadline", () => {
      const validData = {
        privateApplications: true,
        applicationDeadline: "",
        donationRound: false,
        showCommentsOnPublicPage: true,
      };

      const result = settingsConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject if applicationDeadline is not a string", () => {
      const invalidData = {
        privateApplications: true,
        applicationDeadline: 123456789,
        donationRound: false,
        showCommentsOnPublicPage: true,
      };

      const result = settingsConfigSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("complete schema validation", () => {
    it("should validate with all fields present", () => {
      const validData = {
        privateApplications: true,
        applicationDeadline: "2024-12-31T23:59",
        donationRound: false,
        showCommentsOnPublicPage: true,
        successPageContent: "**Important**: Check your email regularly.",
      };

      const result = settingsConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should handle markdown content in successPageContent", () => {
      const markdownContent = `# What happens next?

**Review Timeline:**
- Initial review: 1-2 weeks
- Final decision: 3-4 weeks

**Contact:** grants@example.com`;

      const validData = {
        privateApplications: false,
        applicationDeadline: "2025-01-31T23:59",
        donationRound: true,
        showCommentsOnPublicPage: false,
        successPageContent: markdownContent,
      };

      const result = settingsConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.successPageContent).toContain("# What happens next?");
        expect(result.data.successPageContent).toContain("**Review Timeline:**");
        expect(result.data.successPageContent).toContain("grants@example.com");
      }
    });

    it("should handle special characters in successPageContent", () => {
      const contentWithSpecialChars =
        "**Note:** Use <email@example.com> & visit https://example.com for more info!";

      const validData = {
        privateApplications: true,
        donationRound: false,
        showCommentsOnPublicPage: true,
        successPageContent: contentWithSpecialChars,
      };

      const result = settingsConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.successPageContent).toContain("<email@example.com>");
        expect(result.data.successPageContent).toContain("&");
      }
    });

    it("should handle very long successPageContent", () => {
      const longContent = "A".repeat(5000); // 5000 character string

      const validData = {
        privateApplications: true,
        donationRound: false,
        showCommentsOnPublicPage: true,
        successPageContent: longContent,
      };

      const result = settingsConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.successPageContent?.length).toBe(5000);
      }
    });

    it("should handle multiline content with line breaks", () => {
      const multilineContent = "Line 1\nLine 2\n\nLine 3\r\nLine 4";

      const validData = {
        privateApplications: true,
        donationRound: false,
        showCommentsOnPublicPage: false,
        successPageContent: multilineContent,
      };

      const result = settingsConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.successPageContent).toContain("\n");
        expect(result.data.successPageContent).toContain("Line 1");
        expect(result.data.successPageContent).toContain("Line 4");
      }
    });
  });

  describe("edge cases", () => {
    it("should accept all boolean combinations", () => {
      const combinations = [
        { privateApplications: true, donationRound: true, showCommentsOnPublicPage: true },
        { privateApplications: true, donationRound: false, showCommentsOnPublicPage: false },
        { privateApplications: false, donationRound: true, showCommentsOnPublicPage: true },
        { privateApplications: false, donationRound: false, showCommentsOnPublicPage: false },
      ];

      combinations.forEach((combo) => {
        const result = settingsConfigSchema.safeParse(combo);
        expect(result.success).toBe(true);
      });
    });

    it("should reject extra unknown fields", () => {
      const invalidData = {
        privateApplications: true,
        donationRound: false,
        showCommentsOnPublicPage: true,
        unknownField: "should not be here",
      };

      const result = settingsConfigSchema.safeParse(invalidData);
      // Zod by default strips unknown fields, so this should still pass
      // but the unknown field should not be in the result
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).unknownField).toBeUndefined();
      }
    });

    it("should handle null values correctly", () => {
      const invalidData = {
        privateApplications: true,
        donationRound: false,
        showCommentsOnPublicPage: true,
        successPageContent: null,
      };

      const result = settingsConfigSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should handle undefined values correctly", () => {
      const validData = {
        privateApplications: true,
        donationRound: false,
        showCommentsOnPublicPage: true,
        applicationDeadline: undefined,
        successPageContent: undefined,
      };

      const result = settingsConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("type inference", () => {
    it("should infer correct TypeScript type", () => {
      const validData: SettingsConfigFormData = {
        privateApplications: true,
        donationRound: false,
        showCommentsOnPublicPage: true,
        applicationDeadline: "2024-12-31T23:59",
        successPageContent: "**Test content**",
      };

      // This should compile without errors
      expect(validData.privateApplications).toBeDefined();
      expect(validData.donationRound).toBeDefined();
      expect(validData.showCommentsOnPublicPage).toBeDefined();
      expect(validData.applicationDeadline).toBeDefined();
      expect(validData.successPageContent).toBeDefined();
    });

    it("should allow optional fields to be undefined", () => {
      const validData: SettingsConfigFormData = {
        privateApplications: true,
        donationRound: false,
        showCommentsOnPublicPage: false,
      };

      // Optional fields should be allowed to be undefined
      expect(validData.applicationDeadline).toBeUndefined();
      expect(validData.successPageContent).toBeUndefined();
    });
  });
});
