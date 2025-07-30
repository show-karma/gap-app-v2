"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { FormSchema } from "@/types/question-builder";
import { useEffect } from "react";

const aiConfigSchema = z.object({
  // systemPrompt: z.string().min(10, 'System prompt must be at least 10 characters'),
  // detailedPrompt: z.string().optional(),
  aiModel: z.string().min(1, "AI model is required"),
  enableRealTimeEvaluation: z.boolean(),
});

type AIConfigFormData = z.infer<typeof aiConfigSchema>;

interface AIPromptConfigurationProps {
  schema: FormSchema;
  onUpdate: (updatedSchema: FormSchema) => void;
  className?: string;
}

export function AIPromptConfiguration({
  schema,
  onUpdate,
  className = "",
}: AIPromptConfigurationProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<AIConfigFormData>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      // systemPrompt: schema.aiConfig?.systemPrompt || '',
      // detailedPrompt: schema.aiConfig?.detailedPrompt || '',
      aiModel: schema.aiConfig?.aiModel || "gpt-4",
      enableRealTimeEvaluation:
        schema.aiConfig?.enableRealTimeEvaluation || false,
    },
  });

  const watchedValues = watch();

  // Auto-update the schema when form values change
  useEffect(() => {
    const subscription = watch((data) => {
      // Only update if we have a valid system prompt (minimum requirement)
      const updatedSchema: FormSchema = {
        ...schema,
        aiConfig: {
          // systemPrompt: data.systemPrompt || '',
          // detailedPrompt: data.detailedPrompt || '',
          aiModel: data.aiModel || "gpt-4",
          enableRealTimeEvaluation: data.enableRealTimeEvaluation || false,
        },
      };
      onUpdate(updatedSchema);
    });

    return () => subscription.unsubscribe();
  }, [watch, onUpdate, schema]);

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          AI Evaluation Configuration
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure AI prompts and settings for automatic evaluation of grant
          applications.
        </p>
      </div>

      <div className="space-y-6">
        {/* System Prompt */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            System Prompt *
          </label>
          <textarea
            {...register("systemPrompt")}
            rows={6}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
            placeholder="Enter the main system prompt that defines how AI should evaluate applications..."
          />
          {errors.systemPrompt && (
            <p className="text-red-500 text-sm mt-1">
              {errors.systemPrompt.message}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            This prompt defines the core evaluation criteria and approach. It
            will be used for both real-time and final evaluations.
          </p>
        </div> */}

        {/* Detailed Prompt */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Detailed Prompt (Optional)
          </label>
          <textarea
            {...register("detailedPrompt")}
            rows={4}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
            placeholder="Enter additional detailed instructions for more comprehensive evaluation..."
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Additional instructions for more comprehensive evaluation. This will
            be used only for the final evaluation after submission.
          </p>
        </div> */}

        {/* AI Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            AI Model *
          </label>
          <select
            {...register("aiModel")}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
          >
            <option value="gpt-4">GPT-4 (Recommended)</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">
              GPT-3.5 Turbo (Faster, less accurate)
            </option>
            <option value="o3-mini">O3 Mini (Latest)</option>
          </select>
          {errors.aiModel && (
            <p className="text-red-500 text-sm mt-1">
              {errors.aiModel.message}
            </p>
          )}
        </div>

        {/* Real-time Evaluation Toggle */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <input
                  {...register("enableRealTimeEvaluation")}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Real-time Evaluation
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                Provide instant feedback to applicants as they complete form
                fields. This uses only the system prompt for faster responses.
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
                <dt className="text-gray-600 dark:text-gray-400">
                  Real-time Evaluation:
                </dt>
                <dd className="text-gray-900 dark:text-white">
                  {schema.aiConfig.enableRealTimeEvaluation
                    ? "Enabled"
                    : "Disabled"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">
                  System Prompt Length:
                </dt>
                <dd className="text-gray-900 dark:text-white">
                  {schema.aiConfig.systemPrompt?.length || 0} characters
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">
                  Detailed Prompt Length:
                </dt>
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
