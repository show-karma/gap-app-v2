"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAvailableAIModels } from "@/hooks/useAvailableAIModels";
import { useProgram } from "@/hooks/usePrograms";
import type { FormSchema } from "@/types/question-builder";

const aiConfigSchema = z.object({
  // systemPrompt: z.string().min(10, 'System prompt must be at least 10 characters'),
  // detailedPrompt: z.string().optional(),
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
  const { data: availableModels = ["gpt-5.2"], isLoading: isLoadingModels } =
    useAvailableAIModels();

  // Get default langfusePromptId from program registry if not set in schema
  const defaultLangfusePromptId =
    schema.aiConfig?.langfusePromptId || program?.langfusePromptId || "";
  const recommendedPrompt = "";

  // Get default model - use schema value if valid, otherwise use first available model
  const defaultModel = useMemo(() => {
    const schemaModel = schema.aiConfig?.aiModel;
    if (schemaModel && availableModels.includes(schemaModel)) {
      return schemaModel;
    }
    return availableModels[0] || "gpt-5.2";
  }, [schema.aiConfig?.aiModel, availableModels]);

  // Track if initial sync has been performed to prevent overwriting user selections
  const hasInitialSyncedRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<AIConfigFormData>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      // systemPrompt: schema.aiConfig?.systemPrompt || '',
      // detailedPrompt: schema.aiConfig?.detailedPrompt || '',
      aiModel: defaultModel,
      enableRealTimeEvaluation: schema.aiConfig?.enableRealTimeEvaluation || false,
      langfusePromptId: defaultLangfusePromptId || recommendedPrompt,
      internalLangfusePromptId: schema.aiConfig?.internalLangfusePromptId || "",
    },
  });

  // Update form value when availableModels loads and current value is invalid
  // Prevents race conditions: only updates invalid values, preserving valid user selections
  useEffect(() => {
    if (!isLoadingModels && availableModels.length > 0) {
      const currentValue = getValues("aiModel");
      const isCurrentValueInvalid = !currentValue || !availableModels.includes(currentValue);

      // Only update if value is invalid (not in availableModels list)
      // This handles:
      // - Initial load with invalid value
      // - Value becoming invalid after availableModels changes
      // - But preserves valid user selections (won't overwrite if value is in the list)
      if (isCurrentValueInvalid) {
        setValue("aiModel", defaultModel, { shouldValidate: false });
      }

      // Mark as synced after first check
      if (!hasInitialSyncedRef.current) {
        hasInitialSyncedRef.current = true;
      }
    }
  }, [availableModels, isLoadingModels, defaultModel, getValues, setValue]);

  const watchedValues = watch();
  const currentLangfusePromptId = watchedValues.langfusePromptId || "";
  const currentInternalLangfusePromptId = watchedValues.internalLangfusePromptId || "";

  const displayValue =
    currentLangfusePromptId === recommendedPrompt ? recommendedPrompt : currentLangfusePromptId;

  // Update form value when program data loads and no langfusePromptId is set
  useEffect(() => {
    if (program?.langfusePromptId && !schema.aiConfig?.langfusePromptId) {
      setValue("langfusePromptId", program.langfusePromptId);
    }
  }, [program?.langfusePromptId, schema.aiConfig?.langfusePromptId, setValue]);

  // Auto-update the schema when form values change
  useEffect(() => {
    if (readOnly || !onUpdate) return; // Don't update in read-only mode

    const subscription = watch((data) => {
      // Only update if we have a valid system prompt (minimum requirement)
      const updatedSchema: FormSchema = {
        ...schema,
        aiConfig: {
          // systemPrompt: data.systemPrompt || '',
          // detailedPrompt: data.detailedPrompt || '',
          aiModel: data.aiModel || availableModels[0] || "gpt-5.2",
          enableRealTimeEvaluation: data.enableRealTimeEvaluation || false,
          langfusePromptId: data.langfusePromptId || "",
          internalLangfusePromptId: data.internalLangfusePromptId || "",
        },
      };
      onUpdate(updatedSchema);
    });

    return () => subscription.unsubscribe();
  }, [watch, onUpdate, schema, readOnly, availableModels]);

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          AI Evaluation Configuration
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure AI prompts and settings for automatic evaluation of grant applications.
        </p>
      </div>

      <div className="space-y-6">
        {/* AI Model Selection */}
        <div>
          <label
            htmlFor="ai-model"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            AI Model *
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
          {errors.aiModel && <p className="text-red-500 text-sm mt-1">{errors.aiModel.message}</p>}
        </div>

        {/* Langfuse Prompt Name */}
        <div>
          <label
            htmlFor="langfuse-prompt"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Langfuse Prompt Name
          </label>
          <input
            id="langfuse-prompt"
            type="text"
            value={displayValue}
            disabled={readOnly}
            onChange={(e) => {
              const value = e.target.value;
              const cleanValue = value.replace(/ \(Recommended\)$/, "");
              setValue("langfusePromptId", cleanValue);
            }}
            className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300 ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
            placeholder=""
          />
          {errors.langfusePromptId && (
            <p className="text-red-500 text-sm mt-1">{errors.langfusePromptId.message}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            The name of the Langfuse prompt to use for AI evaluation. If not specified, the default
            prompt from the program registry will be used.
          </p>
        </div>

        {/* Internal AI Evaluation Prompt Name */}
        <div>
          <label
            htmlFor="internal-langfuse-prompt"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Internal AI Evaluation Prompt Name
          </label>
          <input
            id="internal-langfuse-prompt"
            type="text"
            value={currentInternalLangfusePromptId}
            disabled={readOnly}
            onChange={(e) => {
              const value = e.target.value;
              setValue("internalLangfusePromptId", value);
            }}
            className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300 ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
            placeholder=""
          />
          {errors.internalLangfusePromptId && (
            <p className="text-red-500 text-sm mt-1">{errors.internalLangfusePromptId.message}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Langfuse prompt name for internal reviewer evaluation (not visible to applicants). This
            evaluation runs automatically after application submission.
          </p>
        </div>

        {/* Real-time Evaluation Toggle */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
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
                Provide instant feedback to applicants as they complete form fields. This uses only
                the system prompt for faster responses.
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
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">System Prompt Length:</dt>
                <dd className="text-gray-900 dark:text-white">
                  {schema.aiConfig.systemPrompt?.length || 0} characters
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Detailed Prompt Length:</dt>
                <dd className="text-gray-900 dark:text-white">
                  {schema.aiConfig.detailedPrompt?.length || 0} characters
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
