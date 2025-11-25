"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useProgram } from "@/hooks/usePrograms"
import type { FormSchema } from "@/types/question-builder"

const aiConfigSchema = z.object({
  // systemPrompt: z.string().min(10, 'System prompt must be at least 10 characters'),
  // detailedPrompt: z.string().optional(),
  aiModel: z.string().min(1, "AI model is required"),
  enableRealTimeEvaluation: z.boolean(),
  langfusePromptId: z.string().optional(),
})

type AIConfigFormData = z.infer<typeof aiConfigSchema>

interface AIPromptConfigurationProps {
  schema: FormSchema
  onUpdate?: (updatedSchema: FormSchema) => void
  className?: string
  programId?: string
  chainId?: number
  readOnly?: boolean
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
  const { data: program } = useProgram(programId || "")

  // Get default langfusePromptId from program registry if not set in schema
  const defaultLangfusePromptId =
    schema.aiConfig?.langfusePromptId || program?.langfusePromptId || ""
  const recommendedPrompt = ""

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
      aiModel: schema.aiConfig?.aiModel || "gpt-4o",
      enableRealTimeEvaluation: schema.aiConfig?.enableRealTimeEvaluation || false,
      langfusePromptId: defaultLangfusePromptId || recommendedPrompt,
    },
  })

  const watchedValues = watch()
  const currentLangfusePromptId = watchedValues.langfusePromptId || ""

  const displayValue =
    currentLangfusePromptId === recommendedPrompt ? recommendedPrompt : currentLangfusePromptId

  // Update form value when program data loads and no langfusePromptId is set
  useEffect(() => {
    if (program?.langfusePromptId && !schema.aiConfig?.langfusePromptId) {
      setValue("langfusePromptId", program.langfusePromptId)
    }
  }, [program?.langfusePromptId, schema.aiConfig?.langfusePromptId, setValue])

  // Auto-update the schema when form values change
  useEffect(() => {
    if (readOnly || !onUpdate) return // Don't update in read-only mode

    const subscription = watch((data) => {
      // Only update if we have a valid system prompt (minimum requirement)
      const updatedSchema: FormSchema = {
        ...schema,
        aiConfig: {
          // systemPrompt: data.systemPrompt || '',
          // detailedPrompt: data.detailedPrompt || '',
          aiModel: data.aiModel || "gpt-4o",
          enableRealTimeEvaluation: data.enableRealTimeEvaluation || false,
          langfusePromptId: data.langfusePromptId || "",
        },
      }
      onUpdate(updatedSchema)
    })

    return () => subscription.unsubscribe()
  }, [watch, onUpdate, schema, readOnly])

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
            disabled={readOnly}
            className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <option value="gpt-4o">GPT-4o (Recommended)</option>
            <option value="gpt-5">GPT-5 (Latest)</option>
            <option value="gpt-5-nano">GPT-5 Nano (Fastest)</option>
            <option value="gpt-5-mini">GPT-5 Mini (Reasoning)</option>
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
              const value = e.target.value
              const cleanValue = value.replace(/ \(Recommended\)$/, "")
              setValue("langfusePromptId", cleanValue)
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
  )
}
