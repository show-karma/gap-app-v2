"use client";

import { useEffect, useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchMilestoneEvaluation, type MilestoneEvaluationItem } from "@/services/milestones";
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

export function AIEvaluationModal({ milestoneUID, isOpen, onClose }: AIEvaluationModalProps) {
  const [evaluations, setEvaluations] = useState<MilestoneEvaluationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && !hasLoaded) {
      setIsLoading(true);
      fetchMilestoneEvaluation(milestoneUID)
        .then((response) => {
          setEvaluations(response.evaluations);
          setHasLoaded(true);
        })
        .catch(() => {
          setEvaluations([]);
          setHasLoaded(true);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, hasLoaded, milestoneUID]);

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
        ) : evaluations.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            No AI evaluation available yet.
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {evaluations.map((evaluation, index) => (
              <div
                key={`${evaluation.model}-${index}`}
                className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4"
              >
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
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
