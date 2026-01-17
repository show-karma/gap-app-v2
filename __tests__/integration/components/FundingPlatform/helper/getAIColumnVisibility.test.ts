import { describe, expect, it } from "bun:test";
import { getAIColumnVisibility } from "@/components/FundingPlatform/helper/getAIColumnVisibility";

describe("getAIColumnVisibility", () => {
  describe("When formSchema has aiConfig", () => {
    it("should show AI score column when langfusePromptId is present in aiConfig", () => {
      const formSchema = {
        aiConfig: {
          langfusePromptId: "prompt-123",
        },
      };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(true);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });

    it("should show internal AI score column when internalLangfusePromptId is present", () => {
      const formSchema = {
        aiConfig: {
          internalLangfusePromptId: "internal-prompt-456",
        },
      };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(true);
    });

    it("should show both columns when both prompt IDs are present", () => {
      const formSchema = {
        aiConfig: {
          langfusePromptId: "prompt-123",
          internalLangfusePromptId: "internal-prompt-456",
        },
      };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(true);
      expect(result.showInternalAIScoreColumn).toBe(true);
    });

    it("should not show columns when aiConfig is empty", () => {
      const formSchema = {
        aiConfig: {},
      };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });
  });

  describe("When using fallback langfusePromptId", () => {
    it("should show AI score column when fallback langfusePromptId is provided", () => {
      const formSchema = undefined;
      const langfusePromptId = "fallback-prompt-789";

      const result = getAIColumnVisibility(formSchema, langfusePromptId);
      expect(result.showAIScoreColumn).toBe(true);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });

    it("should prefer aiConfig langfusePromptId over fallback", () => {
      const formSchema = {
        aiConfig: {
          langfusePromptId: "config-prompt",
        },
      };
      const langfusePromptId = "fallback-prompt";

      const result = getAIColumnVisibility(formSchema, langfusePromptId);
      expect(result.showAIScoreColumn).toBe(true);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });

    it("should use fallback when aiConfig langfusePromptId is missing", () => {
      const formSchema = {
        aiConfig: {},
      };
      const langfusePromptId = "fallback-prompt";

      const result = getAIColumnVisibility(formSchema, langfusePromptId);
      expect(result.showAIScoreColumn).toBe(true);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle undefined formSchema", () => {
      const result = getAIColumnVisibility(undefined);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });

    it("should handle null formSchema", () => {
      const result = getAIColumnVisibility(null as any);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });

    it("should handle formSchema without aiConfig", () => {
      const formSchema = {
        fields: [],
      };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });

    it("should handle empty string prompt IDs as falsy", () => {
      const formSchema = {
        aiConfig: {
          langfusePromptId: "",
          internalLangfusePromptId: "",
        },
      };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });

    it("should handle empty string fallback prompt ID as falsy", () => {
      const formSchema = undefined;
      const langfusePromptId = "";

      const result = getAIColumnVisibility(formSchema, langfusePromptId);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle typical program config structure", () => {
      const formSchema = {
        fields: [
          { name: "projectTitle", type: "text" },
          { name: "description", type: "textarea" },
        ],
        aiConfig: {
          langfusePromptId: "prompt-abc-123",
          internalLangfusePromptId: "internal-prompt-xyz-789",
        },
      };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(true);
      expect(result.showInternalAIScoreColumn).toBe(true);
    });

    it("should handle program with only external AI evaluation", () => {
      const formSchema = {
        aiConfig: {
          langfusePromptId: "external-prompt",
        },
      };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(true);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });

    it("should handle program with only internal AI evaluation", () => {
      const formSchema = {
        aiConfig: {
          internalLangfusePromptId: "internal-only-prompt",
        },
      };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(true);
    });

    it("should handle legacy program with fallback prompt ID", () => {
      const formSchema = undefined;
      const langfusePromptId = "legacy-prompt-id";

      const result = getAIColumnVisibility(formSchema, langfusePromptId);
      expect(result.showAIScoreColumn).toBe(true);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });
  });
});
