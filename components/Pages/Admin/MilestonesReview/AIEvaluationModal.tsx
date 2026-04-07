"use client";

import { memo } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMilestoneEvaluation } from "@/hooks/useMilestoneEvaluation";
import type { MilestoneEvaluationItem } from "@/services/milestones";
import { formatDate } from "@/utilities/formatDate";

interface AIEvaluationModalProps {
  milestoneUID: string;
  isOpen: boolean;
  onClose: () => void;
}

function getRatingColor(rating: number): string {
  if (rating >= 8) return "text-green-600 dark:text-green-400";
  if (rating >= 5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getRatingBgColor(rating: number): string {
  if (rating >= 8) return "bg-green-100 dark:bg-green-900/20";
  if (rating >= 5) return "bg-yellow-100 dark:bg-yellow-900/20";
  return "bg-red-100 dark:bg-red-900/20";
}

function formatReasoning(text: string): string {
  if (text.includes("\n") || text.includes("**") || text.includes("# ")) {
    return text;
  }

  return text.replace(
    /\.\s+(Relevance:|Evidence\b|Completeness:|Overall:|Strength:|Weakness:|However,|In summary|In conclusion|The (?:milestone|project|grant|evidence|completion|submitted))/g,
    ".\n\n$1"
  );
}

interface EvaluationCardProps {
  evaluation: MilestoneEvaluationItem;
}

const EvaluationCard = memo(function EvaluationCard({ evaluation }: EvaluationCardProps) {
  return (
    <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full ${getRatingBgColor(evaluation.rating)}`}
        >
          <span className={`text-lg font-bold ${getRatingColor(evaluation.rating)}`}>
            {evaluation.rating}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">/ 10</span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
          {evaluation.model}
        </span>
      </div>

      <div className="text-sm text-gray-700 dark:text-gray-300">
        <MarkdownPreview source={formatReasoning(evaluation.reasoning)} />
      </div>

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Evaluated: {formatDate(evaluation.createdAt)}
      </div>
    </div>
  );
});

export function AIEvaluationModal({ milestoneUID, isOpen, onClose }: AIEvaluationModalProps) {
  const { data, isLoading, error, refetch } = useMilestoneEvaluation(milestoneUID, isOpen);
  const evaluations = data?.evaluations ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-white dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-black dark:text-white">AI Evaluation</DialogTitle>
          <DialogDescription>
            AI-generated evaluation of milestone completion quality.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-500 dark:text-red-400">
            <p>Failed to load evaluation.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        ) : evaluations.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            No AI evaluation available yet.
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {evaluations.map((evaluation) => (
              <EvaluationCard
                key={`${evaluation.milestoneUID}-${evaluation.model}-${evaluation.createdAt}`}
                evaluation={evaluation}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
