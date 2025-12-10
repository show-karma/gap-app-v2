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
 * Determines AI column visibility based on configured prompts
 * @param formSchema - The form schema from program config (may have aiConfig)
 * @param langfusePromptId - Fallback langfusePromptId from program registry
 * @returns Object with column visibility flags
 */
export function getAIColumnVisibility(
  formSchema: unknown,
  langfusePromptId?: string
): {
  showAIScoreColumn: boolean;
  showInternalAIScoreColumn: boolean;
} {
  const formSchemaWithAiConfig = formSchema as FormSchemaWithAiConfig | undefined;
  const aiConfig = formSchemaWithAiConfig?.aiConfig;

  return {
    showAIScoreColumn: !!(aiConfig?.langfusePromptId || langfusePromptId),
    showInternalAIScoreColumn: !!aiConfig?.internalLangfusePromptId,
  };
}
