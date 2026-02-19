import type { ProgramPromptsResponse } from "@/src/features/prompt-management/types/program-prompt";
import type { IFundingApplication } from "@/types/funding-platform";
import { getAIScore } from "./getAIScore";
import { getInternalAIScore } from "./getInternalAIScore";

/**
 * Type for form schema with AI configuration
 */
type FormSchemaWithAiConfig = {
  aiConfig?: {
    langfusePromptId?: string;
    internalLangfusePromptId?: string;
  };
};

/**
 * Determines AI column visibility based on three sources (checked in order):
 *
 * 1. Legacy config: formSchema.aiConfig.langfusePromptId is set
 * 2. New prompt system: program_prompts collection has an external/internal prompt
 * 3. Application data: any application has a parseable AI evaluation score
 *
 * @param formSchema - The form schema from program config (may have aiConfig)
 * @param promptsData - The program prompts from the new prompt management system
 * @param applications - The list of funding applications to check for scores
 * @returns Object with column visibility flags
 */
export function getAIColumnVisibility(
  formSchema: unknown,
  promptsData?: ProgramPromptsResponse | null,
  applications?: IFundingApplication[]
): {
  showAIScoreColumn: boolean;
  showInternalAIScoreColumn: boolean;
} {
  const formSchemaWithAiConfig = formSchema as FormSchemaWithAiConfig | undefined;
  const aiConfig = formSchemaWithAiConfig?.aiConfig;

  // 1. Legacy config check
  const hasLegacyExternalPrompt = !!aiConfig?.langfusePromptId;
  const hasLegacyInternalPrompt = !!aiConfig?.internalLangfusePromptId;

  // 2. New prompt system check
  const hasNewExternalPrompt = !!promptsData?.external;
  const hasNewInternalPrompt = !!promptsData?.internal;

  // 3. Application data check (only if neither config source matched)
  const hasApplicationWithAIScore =
    !hasLegacyExternalPrompt &&
    !hasNewExternalPrompt &&
    !!applications?.some((app) => getAIScore(app) !== null);

  const hasApplicationWithInternalAIScore =
    !hasLegacyInternalPrompt &&
    !hasNewInternalPrompt &&
    !!applications?.some((app) => getInternalAIScore(app) !== null);

  return {
    showAIScoreColumn: hasLegacyExternalPrompt || hasNewExternalPrompt || hasApplicationWithAIScore,
    showInternalAIScoreColumn:
      hasLegacyInternalPrompt || hasNewInternalPrompt || hasApplicationWithInternalAIScore,
  };
}
