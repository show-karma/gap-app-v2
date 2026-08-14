"use client";

import { useEffect } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { formatModelLabel } from "@/utilities/portfolio-reports/modelOptions";
import { cn } from "@/utilities/tailwind";

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

interface ModelSelectFieldProps {
  modelOptions: string[];
  isLoadingModels: boolean;
  isModelsError: boolean;
  unavailableModelId?: string;
  registration: UseFormRegisterReturn<"modelId">;
  error?: string;
  onRetryModels: () => void;
}

export function ModelSelectField({
  modelOptions,
  isLoadingModels,
  isModelsError,
  unavailableModelId,
  registration,
  error,
  onRetryModels,
}: ModelSelectFieldProps) {
  const isDisabled = isLoadingModels || isModelsError || modelOptions.length === 0;

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
        disabled={isDisabled}
        className={cn(
          "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100",
          isDisabled && "cursor-not-allowed opacity-50"
        )}
        {...registration}
      >
        {isLoadingModels ? (
          <option value="">Loading models...</option>
        ) : isModelsError ? (
          <option value="">Models unavailable</option>
        ) : modelOptions.length === 0 ? (
          <option value="">No models configured</option>
        ) : (
          modelOptions.map((modelId) => (
            <option key={modelId} value={modelId}>
              {formatModelLabel(modelId)}
              {modelId === unavailableModelId ? " (not currently permitted)" : ""}
            </option>
          ))
        )}
      </select>
      {isModelsError && (
        <button
          type="button"
          onClick={onRetryModels}
          className="mt-2 text-sm text-blue-600 underline hover:no-underline dark:text-blue-400"
        >
          Retry loading models
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
