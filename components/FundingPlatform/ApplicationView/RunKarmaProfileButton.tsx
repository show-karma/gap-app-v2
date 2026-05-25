"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { useReEvaluateKarmaProfileAI } from "@/hooks/useReEvaluateKarmaProfileAI";

interface RunKarmaProfileButtonProps {
  referenceNumber: string;
  onEvaluationComplete?: () => void | Promise<void>;
  disabled?: boolean;
}

/**
 * First-run trigger for the Karma Profile (track-record) evaluation.
 * Used when no `karmaProfileEvaluation` record exists yet (pre-feature
 * application, no backfill). Hits the same endpoint as Re-evaluate but
 * skips the confirmation dialog — there's no prior verdict to overwrite,
 * so the destructive guard isn't needed.
 *
 * For re-running an existing evaluation, use ReEvaluateKarmaProfileButton.
 */
export const RunKarmaProfileButton: FC<RunKarmaProfileButtonProps> = ({
  referenceNumber,
  onEvaluationComplete,
  disabled = false,
}) => {
  const mutation = useReEvaluateKarmaProfileAI({ onSuccess: onEvaluationComplete });

  const handleRun = async () => {
    if (disabled || mutation.isPending) return;
    try {
      await mutation.mutateAsync(referenceNumber);
      toast.success("Track-record evaluation completed");
    } catch (error) {
      let message = "Failed to run track-record evaluation";
      if (error && typeof error === "object" && "isAxiosError" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        message = axiosError.response?.data?.message || axiosError.message || message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
    }
  };

  return (
    <Button
      onClick={handleRun}
      variant="secondary"
      disabled={disabled || mutation.isPending}
      aria-busy={mutation.isPending}
      aria-label={
        mutation.isPending ? "Track-record evaluation in progress" : "Run track-record evaluation"
      }
      className={`flex items-center gap-x-2 px-3 py-2 text-sm ${
        mutation.isPending ? "animate-pulse" : ""
      }`}
    >
      <SparklesIcon className={`w-4 h-4 ${mutation.isPending ? "animate-spin" : ""}`} />
      <span>{mutation.isPending ? "Running Insights..." : "Run Insights"}</span>
    </Button>
  );
};
