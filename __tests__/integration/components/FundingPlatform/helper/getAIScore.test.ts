import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { formatAIScore, getAIScore } from "@/components/FundingPlatform/helper/getAIScore";
import type { IFundingApplication } from "@/types/funding-platform";

// Mock console.warn to avoid noise in tests
const mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation();

// Helper to create a basic application object
const createMockApplication = (aiEvaluation?: any): IFundingApplication => ({
  id: "test-id",
  programId: "test-program",
  chainID: 11155111,
  applicantEmail: "test@example.com",
  applicationData: {},
  status: "pending",
  statusHistory: [],
  referenceNumber: "APP-TEST-123",
  submissionIP: "127.0.0.1",
  aiEvaluation,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe("getAIScore", () => {
  beforeEach(() => {
    mockConsoleWarn.mockClear();
  });

  afterAll(() => {
    mockConsoleWarn.mockRestore();
  });

  describe("Valid score extraction", () => {
    it("should extract valid final_score from AI evaluation", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ final_score: 4.5 }),
        promptId: "test-prompt",
      });

      const score = getAIScore(application);
      expect(score).toBe(4.5);
    });

    it("should handle integer scores", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ final_score: 3 }),
        promptId: "test-prompt",
      });

      const score = getAIScore(application);
      expect(score).toBe(3);
    });

    it("should handle zero score", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ final_score: 0 }),
        promptId: "test-prompt",
      });

      const score = getAIScore(application);
      expect(score).toBe(0);
    });

    it("should handle edge case scores within range", () => {
      const testCases = [0, 0.1, 50, 99.9, 100];

      testCases.forEach((scoreValue) => {
        const application = createMockApplication({
          evaluation: JSON.stringify({ final_score: scoreValue }),
          promptId: "test-prompt",
        });

        const score = getAIScore(application);
        expect(score).toBe(scoreValue);
      });
    });
  });

  describe("Missing or invalid data handling", () => {
    it("should return null when aiEvaluation is undefined", () => {
      const application = createMockApplication(undefined);
      const score = getAIScore(application);
      expect(score).toBeNull();
    });

    it("should return null when aiEvaluation is null", () => {
      const application = createMockApplication(null);
      const score = getAIScore(application);
      expect(score).toBeNull();
    });

    it("should return null when evaluation field is missing", () => {
      const application = createMockApplication({
        promptId: "test-prompt",
      });
      const score = getAIScore(application);
      expect(score).toBeNull();
    });

    it("should return null when evaluation is empty string", () => {
      const application = createMockApplication({
        evaluation: "",
        promptId: "test-prompt",
      });
      const score = getAIScore(application);
      expect(score).toBeNull();
    });

    it("should return null when evaluation is not a string", () => {
      const application = createMockApplication({
        evaluation: { final_score: 4.5 }, // Object instead of string
        promptId: "test-prompt",
      });
      const score = getAIScore(application);
      expect(score).toBeNull();
      // New implementation silently returns null without warning for non-string evaluation
    });
  });

  describe("JSON parsing error handling", () => {
    it("should handle invalid JSON gracefully", () => {
      const application = createMockApplication({
        evaluation: "invalid json {",
        promptId: "test-prompt",
      });

      const score = getAIScore(application);
      expect(score).toBeNull();
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Failed to parse aiEvaluation for application:",
        expect.objectContaining({
          referenceNumber: "APP-TEST-123",
          error: expect.any(String),
          evaluationData: expect.any(String),
        })
      );
    });

    it("should handle empty JSON object", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({}),
        promptId: "test-prompt",
      });

      const score = getAIScore(application);
      expect(score).toBeNull();
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("aiEvaluation evaluation missing valid score field"),
        {}
      );
    });

    it("should handle JSON with wrong field name", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ score: 4.5 }), // Wrong field name
        promptId: "test-prompt",
      });

      const score = getAIScore(application);
      expect(score).toBeNull();
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("aiEvaluation evaluation missing valid score field"),
        { score: 4.5 }
      );
    });
  });

  describe("Type validation", () => {
    it("should handle non-numeric final_score", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ final_score: "not a number" }),
        promptId: "test-prompt",
      });

      const score = getAIScore(application);
      expect(score).toBeNull();
    });

    it("should handle NaN final_score", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ final_score: NaN }),
        promptId: "test-prompt",
      });

      const score = getAIScore(application);
      expect(score).toBeNull();
    });

    it("should handle null final_score", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ final_score: null }),
        promptId: "test-prompt",
      });

      const score = getAIScore(application);
      expect(score).toBeNull();
    });
  });

  describe("Range validation", () => {
    it("should return null for scores below 0", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ final_score: -1 }),
        promptId: "test-prompt",
      });

      const score = getAIScore(application);
      expect(score).toBeNull(); // New implementation returns null for out-of-range scores
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "aiEvaluation score outside expected range (0-100):",
        -1
      );
    });

    it("should return null for scores above 100", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ final_score: 150 }),
        promptId: "test-prompt",
      });

      const score = getAIScore(application);
      expect(score).toBeNull(); // New implementation returns null for out-of-range scores
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "aiEvaluation score outside expected range (0-100):",
        150
      );
    });
  });
});

describe("formatAIScore", () => {
  it("should format whole numbers without decimals", () => {
    const application = createMockApplication({
      evaluation: JSON.stringify({ final_score: 3 }),
      promptId: "test-prompt",
    });

    const formatted = formatAIScore(application);
    expect(formatted).toBe("3");
  });

  it("should format decimal numbers with 1 decimal place", () => {
    const application = createMockApplication({
      evaluation: JSON.stringify({ final_score: 3.7 }),
      promptId: "test-prompt",
    });

    const formatted = formatAIScore(application);
    expect(formatted).toBe("3.7");
  });

  it('should show "0" for zero score', () => {
    const application = createMockApplication({
      evaluation: JSON.stringify({ final_score: 0 }),
      promptId: "test-prompt",
    });

    const formatted = formatAIScore(application);
    expect(formatted).toBe("0");
  });

  it("should return empty string for missing score", () => {
    const application = createMockApplication(undefined);

    const formatted = formatAIScore(application);
    expect(formatted).toBe("");
  });

  it("should return empty string for invalid score", () => {
    const application = createMockApplication({
      evaluation: "invalid json",
      promptId: "test-prompt",
    });

    const formatted = formatAIScore(application);
    expect(formatted).toBe("");
  });

  it("should handle edge case formatting", () => {
    const testCases = [
      { score: 0.0, expected: "0" },
      { score: 1.0, expected: "1" },
      { score: 1.5, expected: "1.5" },
      { score: 99.9, expected: "99.9" },
      { score: 100.0, expected: "100" },
    ];

    testCases.forEach(({ score, expected }) => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ final_score: score }),
        promptId: "test-prompt",
      });

      const formatted = formatAIScore(application);
      expect(formatted).toBe(expected);
    });
  });
});
