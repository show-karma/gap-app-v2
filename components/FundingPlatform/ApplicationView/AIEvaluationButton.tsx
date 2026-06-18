"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import { type FC, useMemo } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { useRunAIEvaluation } from "@/hooks/useRunAIEvaluation";
import { extractApiErrorMessage } from "@/utilities/errors";

interface AIEvaluationButtonProps {
  referenceNumber: string;
  onEvaluationComplete?: () => void | Promise<void>;
  disabled?: boolean;
  isInternal?: boolean;
}

/**
 * Button component for running AI evaluation on funding applications.
 * Supports both regular and internal evaluation modes.
 *
 * Pending state and parent refresh are driven by the `useRunAIEvaluation`
 * mutation, so a successful run invalidates the funding-application/applications
 * caches and propagates the new verdict to every consumer — not just the
 * optional `onEvaluationComplete` callback.
 *
 * @param referenceNumber - The application reference number
 * @param onEvaluationComplete - Optional callback called after successful evaluation
 * @param disabled - Whether the button should be disabled
 * @param isInternal - If true, runs internal evaluation (not visible to applicants)
 */
const AIEvaluationButton: FC<AIEvaluationButtonProps> = ({
  referenceNumber,
  onEvaluationComplete,
  disabled = false,
  isInternal = false,
}) => {
  const mutation = useRunAIEvaluation({ isInternal, onSuccess: onEvaluationComplete });

  // Memoize button text and labels to avoid unnecessary re-renders
  const buttonText = useMemo(() => {
    const prefix = isInternal ? "Internal " : "";
    return {
      idle: `Run ${prefix}AI Evaluation`,
      loading: `Running ${prefix}AI Evaluation...`,
      ariaLabel: `Run ${prefix}AI evaluation`,
      ariaLabelLoading: `${prefix}AI evaluation in progress`,
    };
  }, [isInternal]);

  const handleRunEvaluation = async () => {
    if (disabled || mutation.isPending) {
      return;
    }

    try {
      await mutation.mutateAsync(referenceNumber);

      toast.success(
        isInternal
          ? "Internal AI evaluation completed successfully!"
          : "AI evaluation completed successfully!"
      );
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Failed to run AI evaluation"));
    }
  };

  const isPending = mutation.isPending;

  return (
    <Button
      onClick={handleRunEvaluation}
      variant="secondary"
      disabled={disabled || isPending}
      aria-label={isPending ? buttonText.ariaLabelLoading : buttonText.ariaLabel}
      aria-busy={isPending}
      className={`flex items-center space-x-2 px-3 py-2 text-sm ${isPending ? "animate-pulse" : ""}`}
    >
      <SparklesIcon className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
      <span>{isPending ? buttonText.loading : buttonText.idle}</span>
    </Button>
  );
};

export default AIEvaluationButton;
