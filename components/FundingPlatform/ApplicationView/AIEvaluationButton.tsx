"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import type { AxiosError } from "axios";
import { type FC, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { fundingApplicationsAPI } from "@/services/fundingPlatformService";

interface AIEvaluationButtonProps {
  referenceNumber: string;
  onEvaluationComplete?: () => void;
  disabled?: boolean;
  isInternal?: boolean;
}

/**
 * Type guard to check if error is an Axios error with response data
 */
function isAxiosErrorWithResponse(error: unknown): error is AxiosError<{ message?: string }> {
  return (
    typeof error === "object" && error !== null && "response" in error && "isAxiosError" in error
  );
}

/**
 * Button component for running AI evaluation on funding applications.
 * Supports both regular and internal evaluation modes.
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
  const [isEvaluating, setIsEvaluating] = useState(false);

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
    if (disabled || isEvaluating) {
      return;
    }

    setIsEvaluating(true);

    try {
      const result = isInternal
        ? await fundingApplicationsAPI.runInternalAIEvaluation(referenceNumber)
        : await fundingApplicationsAPI.runAIEvaluation(referenceNumber);

      toast.success(
        isInternal
          ? "Internal AI evaluation completed successfully!"
          : "AI evaluation completed successfully!"
      );

      // Call the callback to refresh the application data
      if (onEvaluationComplete) {
        try {
          await onEvaluationComplete();
        } catch (refreshError) {
          const errorPrefix = isInternal ? "internal " : "";
          console.error(
            `Failed to refresh application after ${errorPrefix}AI evaluation:`,
            refreshError
          );
          toast.error(
            "Evaluation completed but failed to refresh the display. Please reload the page."
          );
        }
      }
    } catch (error) {
      console.error("Failed to run AI evaluation:", error);

      let errorMessage = "Failed to run AI evaluation";

      // Check for AxiosError-like objects (with isAxiosError property)
      if (error && typeof error === "object" && "isAxiosError" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        // If response exists, use response.data.message, otherwise use the error message
        errorMessage = axiosError.response?.data?.message || axiosError.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "response" in error) {
        const responseError = error as { response?: { data?: { message?: string } } };
        errorMessage = responseError.response?.data?.message || errorMessage;
      }

      toast.error(errorMessage);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <Button
      onClick={handleRunEvaluation}
      variant="secondary"
      disabled={disabled || isEvaluating}
      aria-label={isEvaluating ? buttonText.ariaLabelLoading : buttonText.ariaLabel}
      aria-busy={isEvaluating}
      className={`flex items-center space-x-2 px-3 py-2 text-sm ${isEvaluating ? "animate-pulse" : ""}`}
    >
      <SparklesIcon className={`w-4 h-4 ${isEvaluating ? "animate-spin" : ""}`} />
      <span>{isEvaluating ? buttonText.loading : buttonText.idle}</span>
    </Button>
  );
};

export default AIEvaluationButton;
