import {
  formatInternalAIScore,
  getFormattedInternalAIResponse,
  getInternalAIResponse,
  getInternalAIScore,
} from "@/components/FundingPlatform/helper/getInternalAIScore";
import type { IFundingApplication } from "@/types/funding-platform";

// Mock console.warn to avoid noise in tests
const mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation();

// Helper to create a basic application object
const createMockApplication = (internalAIEvaluation?: any): IFundingApplication => ({
  id: "test-id",
  programId: "test-program",
  chainID: 11155111,
  applicantEmail: "test@example.com",
  applicationData: {},
  status: "pending",
  statusHistory: [],
  referenceNumber: "APP-TEST-123",
  submissionIP: "127.0.0.1",
  internalAIEvaluation,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe("getInternalAIScore", () => {
  beforeEach(() => {
    mockConsoleWarn.mockClear();
  });

  afterAll(() => {
    mockConsoleWarn.mockRestore();
  });

  describe("Valid score extraction", () => {
    it("should extract valid total_score from internal AI evaluation", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ total_score: 4.5 }),
        promptId: "internal-prompt",
      });

      const score = getInternalAIScore(application);
      expect(score).toBe(4.5);
    });

    it("should also extract final_score from internal AI evaluation", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ final_score: 8.5 }),
        promptId: "internal-prompt",
      });

      const score = getInternalAIScore(application);
      expect(score).toBe(8.5);
    });

    it("should handle integer scores", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ total_score: 3 }),
        promptId: "internal-prompt",
      });

      const score = getInternalAIScore(application);
      expect(score).toBe(3);
    });

    it("should handle zero score", () => {
      const application = createMockApplication({
        evaluation: JSON.stringify({ total_score: 0 }),
        promptId: "internal-prompt",
      });

      const score = getInternalAIScore(application);
      expect(score).toBe(0);
    });
  });

  describe("Missing or invalid data handling", () => {
    it("should return null when internalAIEvaluation is undefined", () => {
      const application = createMockApplication(undefined);
      const score = getInternalAIScore(application);
      expect(score).toBeNull();
    });

    it("should return null when evaluation field is missing", () => {
      const application = createMockApplication({
        promptId: "internal-prompt",
      });
      const score = getInternalAIScore(application);
      expect(score).toBeNull();
    });

    it("should return null when evaluation is invalid JSON", () => {
      const application = createMockApplication({
        evaluation: "invalid json {",
        promptId: "internal-prompt",
      });

      const score = getInternalAIScore(application);
      expect(score).toBeNull();
    });
  });
});

describe("formatInternalAIScore", () => {
  it("should format whole numbers without decimals", () => {
    const application = createMockApplication({
      evaluation: JSON.stringify({ final_score: 3 }),
      promptId: "internal-prompt",
    });

    const formatted = formatInternalAIScore(application);
    expect(formatted).toBe("3");
  });

  it("should format decimal numbers with 1 decimal place", () => {
    const application = createMockApplication({
      evaluation: JSON.stringify({ final_score: 3.7 }),
      promptId: "internal-prompt",
    });

    const formatted = formatInternalAIScore(application);
    expect(formatted).toBe("3.7");
  });

  it('should show "0" for zero score', () => {
    const application = createMockApplication({
      evaluation: JSON.stringify({ final_score: 0 }),
      promptId: "internal-prompt",
    });

    const formatted = formatInternalAIScore(application);
    expect(formatted).toBe("0");
  });

  it("should return empty string for missing score", () => {
    const application = createMockApplication(undefined);

    const formatted = formatInternalAIScore(application);
    expect(formatted).toBe("");
  });

  it("should return empty string for invalid score", () => {
    const application = createMockApplication({
      evaluation: "invalid json",
      promptId: "internal-prompt",
    });

    const formatted = formatInternalAIScore(application);
    expect(formatted).toBe("");
  });
});

describe("getInternalAIResponse", () => {
  it("should return evaluation string when available", () => {
    const evaluationString = JSON.stringify({ final_score: 85 });
    const application = createMockApplication({
      evaluation: evaluationString,
      promptId: "internal-prompt",
    });

    const response = getInternalAIResponse(application);
    expect(response).toBe(evaluationString);
  });

  it("should return null when evaluation is missing", () => {
    const application = createMockApplication(undefined);
    const response = getInternalAIResponse(application);
    expect(response).toBeNull();
  });

  it("should return null when evaluation is not a string", () => {
    const application = createMockApplication({
      evaluation: { final_score: 85 },
      promptId: "internal-prompt",
    });

    const response = getInternalAIResponse(application);
    expect(response).toBeNull();
  });
});

describe("getFormattedInternalAIResponse", () => {
  beforeEach(() => {
    mockConsoleWarn.mockClear();
  });

  it("should format valid evaluation JSON", () => {
    const evaluation = {
      evaluation_status: "approved",
      final_score: 85,
      decision: "accept",
    };

    const application = createMockApplication({
      evaluation: JSON.stringify(evaluation),
      promptId: "internal-prompt",
    });

    const formatted = getFormattedInternalAIResponse(application);
    expect(formatted).toContain("evaluation_status");
    expect(formatted).toContain("approved");
    expect(formatted).toContain("final_score");
    expect(formatted).toContain("85");
  });

  it("should return empty string when evaluation is missing", () => {
    const application = createMockApplication(undefined);
    const formatted = getFormattedInternalAIResponse(application);
    expect(formatted).toBe("");
  });

  it("should return empty string for invalid JSON", () => {
    const application = createMockApplication({
      evaluation: "invalid json {",
      promptId: "internal-prompt",
    });

    const formatted = getFormattedInternalAIResponse(application);
    expect(formatted).toBe("");
    // Note: formatEvaluationResponse logs a warning, but it's in a different module
    // so the mock may not capture it. The important part is that it returns empty string.
  });

  it("should format complex evaluation with all fields", () => {
    const evaluation = {
      evaluation_status: "approved",
      final_score: 87.5,
      evaluation_summary: {
        strengths: ["Strong team"],
        concerns: ["Budget"],
      },
      improvement_recommendations: [
        {
          priority: "high",
          recommendation: "Expand team",
        },
      ],
    };

    const application = createMockApplication({
      evaluation: JSON.stringify(evaluation),
      promptId: "internal-prompt",
    });

    const formatted = getFormattedInternalAIResponse(application);
    expect(formatted).toContain("evaluation_status");
    expect(formatted).toContain("evaluation_summary");
    expect(formatted).toContain("strengths");
    expect(formatted).toContain("improvement_recommendations");
  });
});
