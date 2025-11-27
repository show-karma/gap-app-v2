"use client";

import { ClockIcon, SunIcon } from "@heroicons/react/24/outline";
import { JSX } from "react";
import {
  parseEvaluation,
  getScoreColor,
  getScoreIcon,
  getPriorityColor,
  getStatusColor,
  type GenericJSON,
} from "./evaluationUtils";
import { EvaluationDisplay } from "./EvaluationComponents";

export type AIEvaluationData = string;

interface AIEvaluationDisplayProps {
  evaluation: AIEvaluationData | null;
  isLoading: boolean;
  isEnabled: boolean;
  className?: string;
  hasError?: boolean;
  programName?: string;
}

interface EvaluationContentProps {
  evaluation: string;
  parseEvaluation: (evaluationStr: string) => GenericJSON | null;
  getScoreIcon: (score: number) => JSX.Element;
  getStatusColor: (status: string) => string;
  getScoreColor: (score: number) => string;
  getPriorityColor: (priority: string) => string;
  programName?: string;
}

function EvaluationContent({
  evaluation,
  parseEvaluation,
  getScoreIcon,
  getStatusColor,
  getScoreColor,
  getPriorityColor,
  programName,
}: EvaluationContentProps) {
  const parsedEvaluation = parseEvaluation(evaluation);

  if (!parsedEvaluation) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <p className="text-sm text-red-600 dark:text-red-400">Failed to parse evaluation data. Please try again.</p>
      </div>
    );
  }

  // Use the evaluation display component for all evaluation data
  return (
    <EvaluationDisplay
      data={parsedEvaluation}
      programName={programName}
      getScoreIcon={getScoreIcon}
      getStatusColor={getStatusColor}
      getScoreColor={getScoreColor}
      getPriorityColor={getPriorityColor}
      footerDisclaimer="This AI-generated review is for guidance only and may not be fully accurate."
    />
  );
}

export function AIEvaluationDisplay({
  evaluation,
  isLoading,
  isEnabled,
  className = "",
  hasError = false,
  programName,
}: AIEvaluationDisplayProps) {
  if (!isEnabled) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className="flex flex-col gap-1 pb-4 items-start">
        <div className="flex items-start justify-start gap-2">
          <SunIcon className="w-5 h-5 text-primary animate-pulse" />
          <h3 className="text-sm font-semibold">AI Evaluation Feedback</h3>
        </div>
        <p className="text-xs text-default-500">Real-time feedback to help improve your application</p>
      </div>

      <div className="pt-0">
        {evaluation ? (
          <EvaluationContent
            evaluation={evaluation}
            parseEvaluation={parseEvaluation}
            getScoreIcon={getScoreIcon}
            getStatusColor={getStatusColor}
            getScoreColor={getScoreColor}
            getPriorityColor={getPriorityColor}
            programName={programName}
          />
        ) : (
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
            <ClockIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">AI evaluation pending</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              The application will be automatically evaluated by AI shortly after submission.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
