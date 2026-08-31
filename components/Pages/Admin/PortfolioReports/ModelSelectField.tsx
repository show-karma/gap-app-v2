"use client";

import { useEffect } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { formatModelLabel } from "@/utilities/portfolio-reports/modelOptions";

// The report config form can mount (via ?new=1) before the models query
// resolves; backfill the default model once the list arrives.
export function useDefaultModelBackfill(
  availableModels: string[],
  isLoadingModels: boolean,
  currentModelId: string,
  onBackfill: (modelId: string) => void
) {
  useEffect(() => {
    if (isLoadingModels || availableModels.length === 0) return;
    if (!currentModelId) {
      onBackfill(availableModels[0]);
    }
  }, [availableModels, isLoadingModels, currentModelId, onBackfill]);
}

export function ModelSelectField({
  modelOptions,
  isLoadingModels,
  registration,
  error,
}: {
  modelOptions: string[];
  isLoadingModels: boolean;
  registration: UseFormRegisterReturn<"modelId">;
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor="modelId"
        className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        LLM Model
      </label>
      <select
        id="modelId"
        disabled={isLoadingModels}
        className={`w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 ${isLoadingModels ? "cursor-not-allowed opacity-50" : ""}`}
        {...registration}
      >
        {isLoadingModels ? (
          <option value="">Loading models...</option>
        ) : (
          modelOptions.map((modelId) => (
            <option key={modelId} value={modelId}>
              {formatModelLabel(modelId)}
            </option>
          ))
        )}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
