"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useProgramConfig } from "@/hooks/useFundingPlatform";
import { zodResolver } from "@/utilities/zodResolver";
import { PageHeader } from "../FundingPlatform/PageHeader";
import { Button } from "../Utilities/Button";

const MAX_AI_INSIGHTS_LENGTH = 2000;

const aiInsightsSchema = z.object({
  aiInsights: z
    .string()
    .max(MAX_AI_INSIGHTS_LENGTH, `Keep guidance under ${MAX_AI_INSIGHTS_LENGTH} characters`),
});

type AIInsightsFormData = z.infer<typeof aiInsightsSchema>;

interface ProgramAIInsightsConfigurationProps {
  programId: string;
  readOnly?: boolean;
}

export function ProgramAIInsightsConfiguration({
  programId,
  readOnly = false,
}: ProgramAIInsightsConfigurationProps) {
  const { config, isLoading, error, updateConfig, isUpdating, refetch } =
    useProgramConfig(programId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<AIInsightsFormData>({
    resolver: zodResolver(aiInsightsSchema),
    defaultValues: { aiInsights: "" },
  });

  // Seed the form once the saved value loads (and re-seed after a save
  // refetches it), so the textarea reflects what is persisted.
  useEffect(() => {
    reset({ aiInsights: config?.aiInsights ?? "" });
  }, [config?.aiInsights, reset]);

  const currentLength = (watch("aiInsights") ?? "").length;

  const onSubmit = (data: AIInsightsFormData) => {
    if (readOnly) return;

    const trimmed = data.aiInsights.trim();
    // Empty clears the field server-side (null), rather than storing "".
    updateConfig({ aiInsights: trimmed.length > 0 ? trimmed : null });
    reset({ aiInsights: trimmed });
  };

  const header = (
    <PageHeader
      title="AI Insights"
      description="Guidance for the Karma AI assistant when it answers questions about this program. Use it to flag data-quality caveats — e.g. a funding round whose records were imported after the fact, so processing-time metrics may be unreliable. The assistant discloses this alongside the affected numbers."
      icon={SparklesIcon}
    />
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6">
          <div className="h-32 w-full animate-pulse rounded-md bg-gray-100 dark:bg-zinc-700" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-400 mb-3">
            Unable to load this program&apos;s AI insights.
          </p>
          <Button onClick={() => refetch()} className="bg-red-600 hover:bg-red-700 text-sm">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6">
          <div className="space-y-2">
            <label
              htmlFor="aiInsights"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Guidance for the AI assistant
            </label>
            <textarea
              {...register("aiInsights")}
              id="aiInsights"
              rows={5}
              disabled={readOnly}
              maxLength={MAX_AI_INSIGHTS_LENGTH}
              placeholder="e.g. Some of this program's records were entered in bulk after the fact, so timing-based metrics may be less reliable — mention this when reporting them."
              aria-invalid={!!errors.aiInsights}
              aria-describedby={errors.aiInsights ? "aiInsights-error" : undefined}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-zinc-700 dark:text-white ${
                errors.aiInsights
                  ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 dark:border-zinc-600"
              } ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            <div className="flex items-center justify-between">
              {errors.aiInsights ? (
                <p
                  id="aiInsights-error"
                  className="text-sm text-red-500 dark:text-red-400"
                  role="alert"
                >
                  {errors.aiInsights.message}
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Leave empty if there is nothing the assistant should disclose.
                </p>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                {currentLength}/{MAX_AI_INSIGHTS_LENGTH}
              </span>
            </div>
          </div>

          {!readOnly && (
            <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-zinc-700">
              <Button
                type="submit"
                disabled={!isDirty || isUpdating}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? "Saving..." : "Save AI Insights"}
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
