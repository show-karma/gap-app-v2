"use client";

import { CpuChipIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PAGE_HEADER_CONTENT, PageHeader } from "@/components/FundingPlatform/PageHeader";
import { useAvailableAIModels } from "@/hooks/useAvailableAIModels";
import { useProgram } from "@/hooks/usePrograms";
import { MigrationBanner, PromptEditor, useProgramPrompts } from "@/src/features/prompt-management";
import type { FormSchema } from "@/types/question-builder";
import { TabContent } from "../Utilities/Tabs/TabContent";
import { Tabs } from "../Utilities/Tabs/Tabs";
import { TabTrigger } from "../Utilities/Tabs/TabTrigger";

const DEFAULT_AI_MODEL = "gpt-4o";

const aiConfigSchema = z.object({
  aiModel: z.string().min(1, "AI model is required"),
  enableRealTimeEvaluation: z.boolean(),
  langfusePromptId: z.string().optional(),
  internalLangfusePromptId: z.string().optional(),
});

type AIConfigFormData = z.infer<typeof aiConfigSchema>;

interface AIPromptConfigurationProps {
  schema: FormSchema;
  onUpdate?: (updatedSchema: FormSchema) => void;
  className?: string;
  programId?: string;
  chainId?: number;
  readOnly?: boolean;
}

function PromptTabs({ programId, readOnly }: { programId: string; readOnly: boolean }) {
  // Fetch prompts from the new API
  const {
    data: promptsData,
    isLoading: isLoadingPrompts,
    isError,
    error,
    refetch,
  } = useProgramPrompts(programId, {
    enabled: !!programId,
  });

  if (isLoadingPrompts) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-700 dark:text-red-400 mb-2">
          Failed to load prompts: {error?.message || "Unknown error"}
        </p>
        <button
          onClick={() => refetch()}
          className="text-red-600 dark:text-red-400 underline text-sm hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const showMigrationBanner =
    promptsData?.migrationRequired &&
    (promptsData.legacyPromptIds.external || promptsData.legacyPromptIds.internal);

  return (
    <>
      {showMigrationBanner && <MigrationBanner legacyPromptIds={promptsData.legacyPromptIds} />}

      <div className="flex flex-row gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg w-fit mb-6">
        <TabTrigger value="external" className="rounded-md">
          External AI Prompt
        </TabTrigger>
        <TabTrigger value="internal" className="rounded-md">
          Internal Evaluation Prompt
        </TabTrigger>
      </div>

      <TabContent value="external">
        <PromptEditor
          programId={programId}
          promptType="external"
          existingPrompt={promptsData?.external || null}
          legacyPromptId={promptsData?.legacyPromptIds.external}
          readOnly={readOnly}
        />
      </TabContent>

      <TabContent value="internal">
        <PromptEditor
          programId={programId}
          promptType="internal"
          existingPrompt={promptsData?.internal || null}
          legacyPromptId={promptsData?.legacyPromptIds.internal}
          readOnly={readOnly}
        />
      </TabContent>
    </>
  );
}

export function AIPromptConfiguration({
  schema,
  onUpdate,
  className = "",
  programId,
  chainId,
  readOnly = false,
}: AIPromptConfigurationProps) {
  // Fetch program data for default langfusePromptId
  const { data: program } = useProgram(programId || "");

  // Fetch available AI models from backend
  const { data: availableModels = [DEFAULT_AI_MODEL], isLoading: isLoadingModels } =
    useAvailableAIModels();

  // Get default langfusePromptId from program registry if not set in schema
  const defaultLangfusePromptId =
    schema.aiConfig?.langfusePromptId || program?.langfusePromptId || "";

  // Get default model - use schema value if valid, otherwise use first available model
  const defaultModel = useMemo(() => {
    const schemaModel = schema.aiConfig?.aiModel;
    if (schemaModel && availableModels.includes(schemaModel)) {
      return schemaModel;
    }
    return availableModels[0] || DEFAULT_AI_MODEL;
  }, [schema.aiConfig?.aiModel, availableModels]);

  const {
    register,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<AIConfigFormData>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      aiModel: defaultModel,
      enableRealTimeEvaluation: schema.aiConfig?.enableRealTimeEvaluation || false,
      langfusePromptId: defaultLangfusePromptId,
      internalLangfusePromptId: schema.aiConfig?.internalLangfusePromptId || "",
    },
  });

  // Update form value when availableModels loads and current value is invalid
  useEffect(() => {
    if (!isLoadingModels && availableModels.length > 0) {
      const currentValue = getValues("aiModel");
      const isCurrentValueInvalid = !currentValue || !availableModels.includes(currentValue);

      if (isCurrentValueInvalid) {
        setValue("aiModel", defaultModel, { shouldValidate: false });
      }
    }
  }, [availableModels, isLoadingModels, defaultModel, getValues, setValue]);

  // Update form value when program data loads and no langfusePromptId is set
  useEffect(() => {
    if (program?.langfusePromptId && !schema.aiConfig?.langfusePromptId) {
      setValue("langfusePromptId", program.langfusePromptId);
    }
  }, [program?.langfusePromptId, schema.aiConfig?.langfusePromptId, setValue]);

  // Refs to hold latest values without causing stale closures in watch subscription
  const schemaRef = useRef(schema);
  const onUpdateRef = useRef(onUpdate);
  const availableModelsRef = useRef(availableModels);

  // Keep refs in sync with latest values
  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);
  useEffect(() => {
    availableModelsRef.current = availableModels;
  }, [availableModels]);

  // Auto-update the schema when form values change
  // Only re-subscribe when watch or readOnly changes, not on schema/onUpdate/availableModels changes
  useEffect(() => {
    if (readOnly || !onUpdateRef.current) return;

    const subscription = watch((data) => {
      const updatedSchema: FormSchema = {
        ...schemaRef.current,
        aiConfig: {
          aiModel: data.aiModel || availableModelsRef.current[0] || DEFAULT_AI_MODEL,
          enableRealTimeEvaluation: data.enableRealTimeEvaluation || false,
          langfusePromptId: data.langfusePromptId || "",
          internalLangfusePromptId: data.internalLangfusePromptId || "",
        },
      };
      onUpdateRef.current?.(updatedSchema);
    });

    return () => subscription.unsubscribe();
  }, [watch, readOnly]);

  return (
    <div className={`space-y-6 ${className}`}>
      <PageHeader
        title={PAGE_HEADER_CONTENT.aiEvaluation.title}
        description={PAGE_HEADER_CONTENT.aiEvaluation.description}
        icon={CpuChipIcon}
      />
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="space-y-6">
          {/* Prompt Management Section */}
          {programId && (
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
              <Tabs defaultTab="external">
                <PromptTabs programId={programId} readOnly={readOnly} />
              </Tabs>
            </div>
          )}

          {/* Legacy Configuration (kept for backwards compatibility) */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Legacy Settings
            </h4>

            {/* AI Model Selection */}
            <div className="mb-4">
              <label
                htmlFor="ai-model"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Default AI Model *
              </label>
              <select
                id="ai-model"
                {...register("aiModel")}
                disabled={readOnly || isLoadingModels}
                className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 ${readOnly || isLoadingModels ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isLoadingModels ? (
                  <option value="">Loading models...</option>
                ) : (
                  availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))
                )}
              </select>
              {errors.aiModel && (
                <p className="text-red-500 text-sm mt-1">{errors.aiModel.message}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This model is used for legacy configurations. New prompts use their own model
                selection.
              </p>
            </div>

            {/* Real-time Evaluation Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <input
                    id="enable-realtime-eval"
                    {...register("enableRealTimeEvaluation")}
                    type="checkbox"
                    disabled={readOnly}
                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                  <label
                    htmlFor="enable-realtime-eval"
                    className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Enable Real-time Evaluation
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                  Provide instant feedback to applicants as they complete form fields.
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Summary */}
          {schema.aiConfig && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Current Configuration
              </h4>
              <dl className="text-xs space-y-1">
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Model:</dt>
                  <dd className="text-gray-900 dark:text-white font-mono">
                    {schema.aiConfig.aiModel}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Real-time Evaluation:</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {schema.aiConfig.enableRealTimeEvaluation ? "Enabled" : "Disabled"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Langfuse Prompt:</dt>
                  <dd className="text-gray-900 dark:text-white font-mono text-xs">
                    {schema.aiConfig.langfusePromptId || "Default from registry"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Internal Prompt:</dt>
                  <dd className="text-gray-900 dark:text-white font-mono text-xs">
                    {schema.aiConfig.internalLangfusePromptId || "Not configured"}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
