"use client";

import { FC, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { fundingApplicationsAPI } from "@/services/fundingPlatformService";
import toast from "react-hot-toast";

interface AIEvaluationButtonProps {
  referenceNumber: string;
  onEvaluationComplete?: (evaluation: {
    evaluation: string;
    promptId: string;
    updatedAt: string;
  }) => void;
  disabled?: boolean;
}

const AIEvaluationButton: FC<AIEvaluationButtonProps> = ({
  referenceNumber,
  onEvaluationComplete,
  disabled = false,
}) => {
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleRunEvaluation = async () => {
    if (disabled || isEvaluating) {
      return;
    }

    setIsEvaluating(true);
    
    try {
      const result = await fundingApplicationsAPI.runAIEvaluation(referenceNumber);
      
      toast.success("AI evaluation completed successfully!");
      
      // Call the callback to refresh the application data
      if (onEvaluationComplete) {
        onEvaluationComplete({
          evaluation: result.evaluation,
          promptId: result.promptId,
          updatedAt: result.updatedAt,
        });
      }
    } catch (error: any) {
      console.error("Failed to run AI evaluation:", error);
      
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to run AI evaluation";
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
      className={`flex items-center space-x-2 px-3 py-2 text-sm ${isEvaluating ? 'animate-pulse' : ''}`}
    >
      <SparklesIcon className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
      <span>{isEvaluating ? "Running AI Evaluation..." : "Run AI Evaluation"}</span>
    </Button>
  );
};

export default AIEvaluationButton;