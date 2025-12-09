/**
 * @file Tests for programFormSchema
 * @description Tests for the Zod schema validation used in program forms
 */

import { createProgramSchema } from "@/schemas/programFormSchema";

describe("createProgramSchema", () => {
  describe("name validation", () => {
    it("should accept valid program name", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
      });

      expect(result.success).toBe(true);
    });

    it("should reject name shorter than 3 characters", () => {
      const result = createProgramSchema.safeParse({
        name: "ab",
        description: "Test description",
        shortDescription: "Short desc",
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
      });

      expect(result.success).toBe(true);
    });

    it("should accept name with exactly 50 characters", () => {
      const result = createProgramSchema.safeParse({
        name: "a".repeat(50),
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
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
      });

      expect(result.success).toBe(true);
    });

    it("should reject description shorter than 3 characters", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "ab",
        shortDescription: "Short desc",
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
      });

      expect(result.success).toBe(true);
    });

    it("should reject empty short description", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "",
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
      });

      expect(result.success).toBe(true);
    });

    it("should accept short description with exactly 1 character", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "a",
        dates: {},
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
      });

      expect(result.success).toBe(true);
    });

    it("should accept program without dates", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
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
      });

      expect(result.success).toBe(true);
    });

    it("should accept program without budget", () => {
      const result = createProgramSchema.safeParse({
        name: "Test Program",
        description: "Test description",
        shortDescription: "Short desc",
        dates: {},
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
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Test Program");
        expect(result.data.description).toBe("This is a test program description");
        expect(result.data.shortDescription).toBe("Short test description");
        expect(result.data.budget).toBe(100000);
      }
    });

    it("should accept minimal valid form", () => {
      const result = createProgramSchema.safeParse({
        name: "ABC",
        description: "abc",
        shortDescription: "a",
        dates: {},
      });

      expect(result.success).toBe(true);
    });
  });
});
