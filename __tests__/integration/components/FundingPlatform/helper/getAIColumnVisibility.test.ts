import { getAIColumnVisibility } from "@/components/FundingPlatform/helper/getAIColumnVisibility";
import type { ProgramPromptsResponse } from "@/src/features/prompt-management/types/program-prompt";
import type { IFundingApplication } from "@/types/funding-platform";

/**
 * Helper to create a minimal mock application with AI evaluation data
 */
function mockApplication(overrides: Partial<IFundingApplication> = {}): IFundingApplication {
  return {
    referenceNumber: "APP-TEST-001",
    ...overrides,
  } as IFundingApplication;
}

function mockAppWithAIScore(score: number): IFundingApplication {
  return mockApplication({
    aiEvaluation: {
      evaluation: JSON.stringify({ final_score: score, feedback: "test" }),
    },
  });
}

function mockAppWithInternalAIScore(score: number): IFundingApplication {
  return mockApplication({
    internalAIEvaluation: {
      evaluation: JSON.stringify({ final_score: score, feedback: "test" }),
    },
  });
}

function mockAppWithoutScore(): IFundingApplication {
  return mockApplication({
    aiEvaluation: {
      evaluation: JSON.stringify({ Applicant_Guidance: "some guidance" }),
    },
  });
}

function mockPromptsResponse(
  overrides: Partial<ProgramPromptsResponse> = {}
): ProgramPromptsResponse {
  return {
    external: null,
    internal: null,
    migrationRequired: false,
    legacyPromptIds: { external: null, internal: null },
    ...overrides,
  };
}

const mockExternalPrompt = {
  id: "1",
  programId: "1045",
  promptType: "external" as const,
  name: "test-prompt",
  systemMessage: "You are a reviewer",
  content: "Evaluate this application",
  modelId: "gpt-4o",
  langfusePromptId: "test-prompt",
  langfuseVersion: 1,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  createdBy: "0x123",
  updatedBy: "0x123",
};

const mockInternalPrompt = {
  ...mockExternalPrompt,
  id: "2",
  promptType: "internal" as const,
  name: "internal-prompt",
  langfusePromptId: "internal-prompt",
};

describe("getAIColumnVisibility", () => {
  describe("Legacy config (formSchema.aiConfig)", () => {
    it("should show AI score column when langfusePromptId is present", () => {
      const formSchema = { aiConfig: { langfusePromptId: "prompt-123" } };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(true);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });

    it("should show internal AI score column when internalLangfusePromptId is present", () => {
      const formSchema = { aiConfig: { internalLangfusePromptId: "internal-456" } };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(true);
    });

    it("should show both columns when both prompt IDs are present", () => {
      const formSchema = {
        aiConfig: { langfusePromptId: "prompt-123", internalLangfusePromptId: "internal-456" },
      };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(true);
      expect(result.showInternalAIScoreColumn).toBe(true);
    });

    it("should not show columns when aiConfig is empty", () => {
      const result = getAIColumnVisibility({ aiConfig: {} });
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });
  });

  describe("New prompt system (program_prompts collection)", () => {
    it("should show AI score column when external prompt exists", () => {
      const formSchema = { aiConfig: { langfusePromptId: "" } };
      const promptsData = mockPromptsResponse({ external: mockExternalPrompt });

      const result = getAIColumnVisibility(formSchema, promptsData);
      expect(result.showAIScoreColumn).toBe(true);
    });

    it("should show internal AI score column when internal prompt exists", () => {
      const formSchema = { aiConfig: { internalLangfusePromptId: "" } };
      const promptsData = mockPromptsResponse({ internal: mockInternalPrompt });

      const result = getAIColumnVisibility(formSchema, promptsData);
      expect(result.showInternalAIScoreColumn).toBe(true);
    });

    it("should show both columns when both prompts exist", () => {
      const formSchema = { aiConfig: {} };
      const promptsData = mockPromptsResponse({
        external: mockExternalPrompt,
        internal: mockInternalPrompt,
      });

      const result = getAIColumnVisibility(formSchema, promptsData);
      expect(result.showAIScoreColumn).toBe(true);
      expect(result.showInternalAIScoreColumn).toBe(true);
    });

    it("should not show columns when prompts are null", () => {
      const formSchema = { aiConfig: {} };
      const promptsData = mockPromptsResponse();

      const result = getAIColumnVisibility(formSchema, promptsData);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });
  });

  describe("Application data fallback", () => {
    it("should show AI score column when any application has a score", () => {
      const formSchema = { aiConfig: {} };
      const promptsData = mockPromptsResponse();
      const applications = [mockAppWithAIScore(7.0), mockAppWithoutScore()];

      const result = getAIColumnVisibility(formSchema, promptsData, applications);
      expect(result.showAIScoreColumn).toBe(true);
    });

    it("should show internal AI score column when any application has an internal score", () => {
      const formSchema = { aiConfig: {} };
      const promptsData = mockPromptsResponse();
      const applications = [mockAppWithInternalAIScore(8.5)];

      const result = getAIColumnVisibility(formSchema, promptsData, applications);
      expect(result.showInternalAIScoreColumn).toBe(true);
    });

    it("should not show column when no application has a parseable score", () => {
      const formSchema = { aiConfig: {} };
      const promptsData = mockPromptsResponse();
      const applications = [mockAppWithoutScore(), mockApplication()];

      const result = getAIColumnVisibility(formSchema, promptsData, applications);
      expect(result.showAIScoreColumn).toBe(false);
    });

    it("should not scan applications when prompt already configured via new system", () => {
      const formSchema = { aiConfig: {} };
      const promptsData = mockPromptsResponse({ external: mockExternalPrompt });
      // Even with no scored applications, column shows because prompt exists
      const applications = [mockAppWithoutScore()];

      const result = getAIColumnVisibility(formSchema, promptsData, applications);
      expect(result.showAIScoreColumn).toBe(true);
    });

    it("should show column with score of 0 (valid score)", () => {
      const formSchema = { aiConfig: {} };
      const applications = [mockAppWithAIScore(0)];

      const result = getAIColumnVisibility(formSchema, null, applications);
      expect(result.showAIScoreColumn).toBe(true);
    });

    it("should not show columns when applications array is empty", () => {
      const result = getAIColumnVisibility({ aiConfig: {} }, null, []);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });
  });

  describe("Priority: legacy > new prompts > application data", () => {
    it("should show column from legacy config even without prompts or scores", () => {
      const formSchema = { aiConfig: { langfusePromptId: "prompt-123" } };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(true);
    });

    it("should show column from new prompts even without legacy config or scores", () => {
      const formSchema = { aiConfig: { langfusePromptId: "" } };
      const promptsData = mockPromptsResponse({ external: mockExternalPrompt });

      const result = getAIColumnVisibility(formSchema, promptsData, []);
      expect(result.showAIScoreColumn).toBe(true);
    });

    it("should show column from application data when no config exists", () => {
      const formSchema = { aiConfig: {} };
      const promptsData = mockPromptsResponse();
      const applications = [mockAppWithAIScore(5)];

      const result = getAIColumnVisibility(formSchema, promptsData, applications);
      expect(result.showAIScoreColumn).toBe(true);
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
      const result = getAIColumnVisibility({ fields: [] });
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });

    it("should handle empty string prompt IDs as falsy", () => {
      const formSchema = {
        aiConfig: { langfusePromptId: "", internalLangfusePromptId: "" },
      };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });

    it("should handle null promptsData", () => {
      const result = getAIColumnVisibility({ aiConfig: {} }, null);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });

    it("should handle undefined promptsData and applications", () => {
      const result = getAIColumnVisibility({ aiConfig: {} }, undefined, undefined);
      expect(result.showAIScoreColumn).toBe(false);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle typical legacy program config", () => {
      const formSchema = {
        fields: [{ name: "projectTitle", type: "text" }],
        aiConfig: {
          langfusePromptId: "prompt-abc-123",
          internalLangfusePromptId: "internal-prompt-xyz",
        },
      };

      const result = getAIColumnVisibility(formSchema);
      expect(result.showAIScoreColumn).toBe(true);
      expect(result.showInternalAIScoreColumn).toBe(true);
    });

    it("should handle program 1045 scenario: new prompt system with empty legacy fields and scored apps", () => {
      const formSchema = {
        aiConfig: {
          aiModel: "gpt-5.2",
          enableRealTimeEvaluation: true,
          langfusePromptId: "",
          internalLangfusePromptId: "",
        },
      };
      const promptsData = mockPromptsResponse({ external: mockExternalPrompt });
      const applications = [mockAppWithAIScore(7.0), mockAppWithoutScore()];

      const result = getAIColumnVisibility(formSchema, promptsData, applications);
      expect(result.showAIScoreColumn).toBe(true);
      expect(result.showInternalAIScoreColumn).toBe(false);
    });

    it("should handle program with new prompt but no scores yet", () => {
      const formSchema = { aiConfig: { langfusePromptId: "" } };
      const promptsData = mockPromptsResponse({ external: mockExternalPrompt });

      const result = getAIColumnVisibility(formSchema, promptsData, []);
      expect(result.showAIScoreColumn).toBe(true);
    });
  });
});
