import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { formatEvaluationResponse } from "@/components/FundingPlatform/helper/formatEvaluationResponse";

// Mock console.warn to avoid noise in tests
const mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation();

describe("formatEvaluationResponse", () => {
  beforeEach(() => {
    mockConsoleWarn.mockClear();
  });

  afterAll(() => {
    mockConsoleWarn.mockRestore();
  });

  describe("Null and undefined handling", () => {
    it("should return empty string for null input", () => {
      expect(formatEvaluationResponse(null)).toBe("");
    });

    it("should return empty string for undefined input", () => {
      expect(formatEvaluationResponse(undefined)).toBe("");
    });

    it("should return empty string for empty string input", () => {
      expect(formatEvaluationResponse("")).toBe("");
    });
  });

  describe("Invalid JSON handling", () => {
    it("should return empty string for invalid JSON", () => {
      const result = formatEvaluationResponse("invalid json {");
      expect(result).toBe("");
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Failed to parse evaluation JSON:",
        expect.any(Error)
      );
    });

    it("should handle malformed JSON gracefully", () => {
      const result = formatEvaluationResponse('{"incomplete":');
      expect(result).toBe("");
      expect(mockConsoleWarn).toHaveBeenCalled();
    });
  });

  describe("Simple field formatting", () => {
    it("should format evaluation with simple fields", () => {
      const evaluation = {
        evaluation_status: "approved",
        decision: "accept",
        final_score: 85,
        reviewer_confidence: "high",
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("evaluation_status");
      expect(result).toContain("approved");
      expect(result).toContain("decision");
      expect(result).toContain("accept");
      expect(result).toContain("final_score");
      expect(result).toContain("85");
      expect(result).toContain("reviewer_confidence");
      expect(result).toContain("high");
    });

    it("should handle null values in simple fields", () => {
      const evaluation = {
        evaluation_status: null,
        decision: "pending",
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("evaluation_status");
      expect(result).toContain("null");
      expect(result).toContain("decision");
      expect(result).toContain("pending");
    });

    it("should handle boolean values", () => {
      const evaluation = {
        is_approved: true,
        is_rejected: false,
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("is_approved");
      expect(result).toContain("true");
      expect(result).toContain("is_rejected");
      expect(result).toContain("false");
    });

    it("should escape newlines in string values", () => {
      const evaluation = {
        additional_notes: "Line 1\nLine 2\nLine 3",
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("Line 1\\nLine 2\\nLine 3");
      expect(result).not.toContain("\n");
    });

    it("should format numeric values correctly", () => {
      const evaluation = {
        final_score: 42.5,
        reviewer_confidence: 95,
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("final_score");
      expect(result).toContain("42.5");
      expect(result).toContain("reviewer_confidence");
      expect(result).toContain("95");
    });
  });

  describe("Evaluation summary formatting", () => {
    it("should format evaluation_summary with arrays", () => {
      const evaluation = {
        evaluation_summary: {
          strengths: ["Strong team", "Clear vision"],
          concerns: ["Limited budget"],
          risk_factors: ["Market volatility"],
        },
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("evaluation_summary");
      expect(result).toContain("strengths");
      expect(result).toContain("Strong team");
      expect(result).toContain("Clear vision");
      expect(result).toContain("concerns");
      expect(result).toContain("Limited budget");
      expect(result).toContain("risk_factors");
      expect(result).toContain("Market volatility");
    });

    it("should handle empty arrays in evaluation_summary", () => {
      const evaluation = {
        evaluation_summary: {
          strengths: [],
          concerns: ["Some concern"],
        },
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("evaluation_summary");
      expect(result).not.toContain("strengths:");
      expect(result).toContain("concerns");
      expect(result).toContain("Some concern");
    });

    it("should handle missing array fields in evaluation_summary", () => {
      const evaluation = {
        evaluation_summary: {
          strengths: ["Only strength"],
        },
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("evaluation_summary");
      expect(result).toContain("strengths");
      expect(result).toContain("Only strength");
    });
  });

  describe("Improvement recommendations formatting", () => {
    it("should format improvement_recommendations with all fields", () => {
      const evaluation = {
        improvement_recommendations: [
          {
            priority: "high",
            recommendation: "Improve documentation",
            impact: "High impact on clarity",
          },
          {
            priority: 1,
            recommendation: "Add more examples",
            impact: "Medium impact",
          },
        ],
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("improvement_recommendations");
      expect(result).toContain("priority");
      expect(result).toContain("high");
      expect(result).toContain("recommendation");
      expect(result).toContain("Improve documentation");
      expect(result).toContain("impact");
      expect(result).toContain("High impact on clarity");
      expect(result).toContain("1");
      expect(result).toContain("Add more examples");
    });

    it("should handle recommendations with missing fields", () => {
      const evaluation = {
        improvement_recommendations: [
          {
            recommendation: "Only recommendation",
          },
          {
            priority: "low",
          },
        ],
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("improvement_recommendations");
      expect(result).toContain("Only recommendation");
      expect(result).toContain("low");
    });

    it("should handle empty recommendations array", () => {
      const evaluation = {
        improvement_recommendations: [],
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).not.toContain("improvement_recommendations");
    });
  });

  describe("Complex evaluation formatting", () => {
    it("should format complete evaluation with all fields", () => {
      const evaluation = {
        evaluation_status: "approved",
        disqualification_reason: null,
        decision: "accept",
        final_score: 87.5,
        evaluation_summary: {
          strengths: ["Innovative approach", "Strong team"],
          concerns: ["Budget constraints"],
          risk_factors: ["Market competition"],
        },
        improvement_recommendations: [
          {
            priority: "high",
            recommendation: "Expand team",
            impact: "High",
          },
        ],
        reviewer_confidence: "very_high",
        additional_notes: "Excellent application",
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("evaluation_status");
      expect(result).toContain("approved");
      expect(result).toContain("decision");
      expect(result).toContain("accept");
      expect(result).toContain("final_score");
      expect(result).toContain("87.5");
      expect(result).toContain("evaluation_summary");
      expect(result).toContain("strengths");
      expect(result).toContain("Innovative approach");
      expect(result).toContain("improvement_recommendations");
      expect(result).toContain("reviewer_confidence");
      expect(result).toContain("very_high");
      expect(result).toContain("additional_notes");
      expect(result).toContain("Excellent application");
    });

    it("should handle additional unknown fields", () => {
      const evaluation = {
        evaluation_status: "pending",
        custom_field: "custom value",
        another_field: 123,
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("evaluation_status");
      expect(result).toContain("pending");
      expect(result).toContain("custom_field");
      expect(result).toContain("custom value");
      expect(result).toContain("another_field");
      expect(result).toContain("123");
    });

    it("should skip null/undefined unknown fields", () => {
      const evaluation = {
        evaluation_status: "pending",
        null_field: null,
        undefined_field: undefined,
        valid_field: "value",
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("evaluation_status");
      expect(result).toContain("valid_field");
      expect(result).toContain("value");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty object", () => {
      const result = formatEvaluationResponse(JSON.stringify({}));
      expect(result).toBe("");
    });

    it("should handle object with only undefined fields", () => {
      const evaluation = {
        evaluation_status: undefined,
        decision: undefined,
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toBe("");
    });

    it("should handle very long string values", () => {
      const longString = "a".repeat(1000);
      const evaluation = {
        additional_notes: longString,
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("additional_notes");
      expect(result).toContain(longString);
    });

    it("should handle special characters in strings", () => {
      const evaluation = {
        decision: "accept & approve",
        additional_notes: "Value: $100, Score: 85%",
      };

      const result = formatEvaluationResponse(JSON.stringify(evaluation));
      expect(result).toContain("accept & approve");
      expect(result).toContain("Value: $100, Score: 85%");
    });
  });
});
