"use client";

import { ClockIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { JSX } from "react";
import { EvaluationDisplay } from "./EvaluationComponents";
import {
  type GenericJSON,
  getPriorityColor,
  getScoreColor,
  getScoreIcon,
  getStatusColor,
  parseEvaluation,
} from "./evaluationUtils";

export type InternalAIEvaluationData = string;

interface InternalAIEvaluationDisplayProps {
  evaluation: InternalAIEvaluationData | null;
  className?: string;
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
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to parse evaluation data. Please try again.
        </p>
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
      footerDisclaimer="This internal AI evaluation is for reviewer use only and is not visible to applicants."
    />
  );
}

/**
 * Component for displaying internal AI evaluation results.
 * This evaluation is only visible to reviewers and admins, not to applicants.
 *
 * @param evaluation - The evaluation JSON string to parse and display
 * @param className - Additional CSS classes to apply
 * @param programName - Optional program name for context
 */
export function InternalAIEvaluationDisplay({
  evaluation,
  className = "",
  programName,
}: InternalAIEvaluationDisplayProps) {
  return (
    <div className={`${className}`}>
      <div className="flex flex-col gap-1 pb-4 items-start">
        <div className="flex items-start justify-start gap-2">
          <LockClosedIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-semibold">Internal AI Evaluation</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          For reviewer use only - not visible to applicants
        </p>
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
            <p className="text-gray-500 dark:text-gray-400 text-sm">Internal evaluation pending</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              The internal evaluation will be automatically generated after application submission.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
