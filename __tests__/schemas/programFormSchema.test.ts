/**
 * @file Tests for programFormSchema
 * @description Tests for the Zod schema validation used in program forms
 */

import { createProgramSchema } from "@/schemas/programFormSchema";

const validEmails = {
  adminEmails: ["admin@example.com"],
  financeEmails: ["finance@example.com"],
};

describe("createProgramSchema", () => {
  describe("name validation", () => {
    it("should accept valid program name", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });

    it("should reject name shorter than 3 characters", () => {
      const result = createProgramSchema.safeParse({
        name: "ab",
        description: "Test description",
        shortDescription: "Short desc",
        ...validEmails,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Program name must be at least 3 characters");
      }
    });

    it("should reject name longer than 50 characters", () => {
      const result = createProgramSchema.safeParse({
        name: "a".repeat(51),
        description: "Test description",
        shortDescription: "Short desc",
        ...validEmails,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Program name must be at most 50 characters");
      }
    });

    it("should accept name with exactly 3 characters", () => {
      const result = createProgramSchema.safeParse({
        name: "abc",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });

    it("should accept name with exactly 50 characters", () => {
      const result = createProgramSchema.safeParse({
        name: "a".repeat(50),
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("description validation", () => {
    it("should accept valid description", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "This is a valid description",
        shortDescription: "Short desc",
        dates: {},
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });

    it("should reject description shorter than 3 characters", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "ab",
        shortDescription: "Short desc",
        ...validEmails,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Description is required");
      }
    });

    it("should accept description with exactly 3 characters", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "abc",
        shortDescription: "Short desc",
        dates: {},
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("shortDescription validation", () => {
    it("should accept valid short description", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short description",
        dates: {},
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });

    it("should reject empty short description", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "",
        ...validEmails,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Short description is required");
      }
    });

    it("should reject short description longer than 100 characters", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "a".repeat(101),
        ...validEmails,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          "Short description must be at most 100 characters"
        );
      }
    });

    it("should accept short description with exactly 100 characters", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "a".repeat(100),
        dates: {},
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });

    it("should accept short description with exactly 1 character", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "a",
        dates: {},
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("dates validation", () => {
    it("should accept valid date range", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {
          startsAt: new Date("2024-06-01"),
          endsAt: new Date("2024-12-31"),
        },
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });

    it("should accept program without dates", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });

    it("should accept program with only start date", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {
          startsAt: new Date("2024-06-01"),
        },
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });

    it("should accept program with only end date", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {
          endsAt: new Date("2024-12-31"),
        },
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });

    it("should reject end date before start date", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {
          startsAt: new Date("2024-12-31"),
          endsAt: new Date("2024-06-01"),
        },
        ...validEmails,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Start date must be before the end date");
        expect(result.error.errors[0].path).toEqual(["dates", "startsAt"]);
      }
    });

    it("should accept same start and end date", () => {
      const sameDate = new Date("2024-06-01");
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {
          startsAt: sameDate,
          endsAt: sameDate,
        },
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("budget validation", () => {
    it("should accept valid budget", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        budget: 100000,
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });

    it("should accept program without budget", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });

    it("should accept zero budget", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        budget: 0,
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });

    it("should reject negative budget", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        budget: -100,
        ...validEmails,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // Find the budget error message
        const budgetError = result.error.errors.find(
          (err) => err.path.includes("budget") || err.message.includes("positive number")
        );
        expect(budgetError?.message).toBe("Budget must be a positive number");
      }
    });

    it("should coerce string budget to number", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        budget: "100000",
        ...validEmails,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.budget).toBe("number");
        expect(result.data.budget).toBe(100000);
      }
    });

    it("should reject non-numeric budget string", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        budget: "not-a-number",
        ...validEmails,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("complete form validation", () => {
    it("should accept complete valid form", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "This is a test program description",
        shortDescription: "Short test description",
        dates: {
          startsAt: new Date("2024-06-01"),
          endsAt: new Date("2024-12-31"),
        },
        budget: 100000,
        adminEmails: ["admin@example.com"],
        financeEmails: ["finance@example.com"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Test Program");
        expect(result.data.description).toBe("This is a test program description");
        expect(result.data.shortDescription).toBe("Short test description");
        expect(result.data.budget).toBe(100000);
        expect(result.data.adminEmails).toEqual(["admin@example.com"]);
        expect(result.data.financeEmails).toEqual(["finance@example.com"]);
      }
    });

    it("should accept minimal valid form", () => {
      const result = createProgramSchema.safeParse({
        name: "ABC",
        description: "abc",
        shortDescription: "a",
        dates: {},
        ...validEmails,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("adminEmails validation", () => {
    it("should require at least one admin email", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        adminEmails: [],
        financeEmails: ["finance@example.com"],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.errors.find((err) => err.path.includes("adminEmails"));
        expect(emailError?.message).toBe("At least one admin email is required");
      }
    });

    it("should reject invalid email addresses", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        adminEmails: ["not-an-email"],
        financeEmails: ["finance@example.com"],
      });

      expect(result.success).toBe(false);
    });

    it("should accept multiple valid admin emails", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        adminEmails: ["admin1@example.com", "admin2@example.com"],
        financeEmails: ["finance@example.com"],
      });

      expect(result.success).toBe(true);
    });
  });

  describe("financeEmails validation", () => {
    it("should require at least one finance email", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        adminEmails: ["admin@example.com"],
        financeEmails: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.errors.find((err) => err.path.includes("financeEmails"));
        expect(emailError?.message).toBe("At least one finance email is required");
      }
    });

    it("should reject invalid finance email addresses", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        ...validEmails,
        financeEmails: ["not-an-email"],
      });

      expect(result.success).toBe(false);
    });

    it("should accept valid finance emails", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
        ...validEmails,
        financeEmails: ["finance@example.com"],
      });

      expect(result.success).toBe(true);
    });
  });
});
