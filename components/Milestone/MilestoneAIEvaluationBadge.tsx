"use client";

import { SparklesIcon } from "@heroicons/react/20/solid";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useApplicationMilestoneEvaluation,
  useMilestoneEvaluation,
} from "@/hooks/useMilestoneEvaluation";
import { formatDate } from "@/utilities/formatDate";

const MarkdownPreview = dynamic(
  () =>
    import("@/components/Utilities/MarkdownPreview").then((m) => ({ default: m.MarkdownPreview })),
  { ssr: false }
);

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600 dark:text-green-400";
  if (score >= 5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 8) return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
  if (score >= 5)
    return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
  return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
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

// ─── Inline Badge ────────────────────────────────────────────────────────────

interface MilestoneAIEvaluationBadgeProps {
  milestoneUID: string;
  className?: string;
}

/**
 * Displays a compact AI evaluation badge for a milestone.
 * Shows the average evaluation score with a sparkles icon.
 * On hover, shows a tooltip with evaluation details.
 * On click, opens a modal with full evaluation reasoning.
 */
export function MilestoneAIEvaluationBadge({
  milestoneUID,
  className = "",
}: MilestoneAIEvaluationBadgeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, isLoading } = useMilestoneEvaluation(milestoneUID, true);
  const evaluations = data?.evaluations ?? [];

  const avgScore = useMemo(() => {
    if (evaluations.length === 0) return null;
    return (
      Math.round((evaluations.reduce((sum, e) => sum + e.rating, 0) / evaluations.length) * 10) / 10
    );
  }, [evaluations]);

  if (isLoading) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400 ${className}`}
      >
        <SparklesIcon className="w-3 h-3" />
        <span className="animate-pulse">…</span>
      </span>
    );
  }

  if (!avgScore || evaluations.length === 0) {
    return null;
  }

  return (
    <>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border cursor-pointer hover:opacity-80 transition-opacity ${getScoreBg(avgScore)} ${className}`}
            >
              <SparklesIcon className="w-3 h-3 text-purple-500 dark:text-purple-400" />
              <span className={`font-semibold ${getScoreColor(avgScore)}`}>{avgScore}/10</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                AI Evaluation
              </p>
              {evaluations.length === 1 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Score:{" "}
                  <span className={`font-semibold ${getScoreColor(evaluations[0].rating)}`}>
                    {evaluations[0].rating}/10
                  </span>
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {evaluations.map((evaluation, idx) => (
                      <span
                        key={idx}
                        className={`text-xs font-semibold ${getScoreColor(evaluation.rating)}`}
                      >
                        {evaluation.rating}/10
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Avg: {avgScore}/10</p>
                </>
              )}
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Click to view details</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isModalOpen && (
        <AIEvaluationInlineModal
          milestoneUID={milestoneUID}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

// ─── Modal for full evaluation details ───────────────────────────────────────

interface AIEvaluationInlineModalProps {
  milestoneUID: string;
  isOpen: boolean;
  onClose: () => void;
}

function AIEvaluationInlineModal({ milestoneUID, isOpen, onClose }: AIEvaluationInlineModalProps) {
  const { data, isLoading, error, refetch } = useMilestoneEvaluation(milestoneUID, isOpen);
  const evaluations = data?.evaluations ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-white dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-black dark:text-white flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            AI Evaluation
          </DialogTitle>
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
              <div
                key={`${evaluation.milestoneUID}-${evaluation.model}-${evaluation.createdAt}`}
                className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4"
              >
                <div className="flex items-center mb-3">
                  <div
                    className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                      evaluation.rating >= 8
                        ? "bg-green-100 dark:bg-green-900/20"
                        : evaluation.rating >= 5
                          ? "bg-yellow-100 dark:bg-yellow-900/20"
                          : "bg-red-100 dark:bg-red-900/20"
                    }`}
                  >
                    <span className={`text-lg font-bold ${getScoreColor(evaluation.rating)}`}>
                      {evaluation.rating}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">/ 10</span>
                  </div>
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

// ─── Application Milestone Badge ────────────────────────────────────────────

interface ApplicationMilestoneAIEvaluationBadgeProps {
  referenceNumber: string;
  milestoneTitle: string;
  className?: string;
}

/**
 * Same as MilestoneAIEvaluationBadge but resolves evaluations
 * via referenceNumber + milestoneTitle instead of on-chain milestone UID.
 */
export function ApplicationMilestoneAIEvaluationBadge({
  referenceNumber,
  milestoneTitle,
  className = "",
}: ApplicationMilestoneAIEvaluationBadgeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, isLoading } = useApplicationMilestoneEvaluation(
    referenceNumber,
    milestoneTitle,
    true
  );
  const evaluations = data?.evaluations ?? [];

  const avgScore = useMemo(() => {
    if (evaluations.length === 0) return null;
    return (
      Math.round((evaluations.reduce((sum, e) => sum + e.rating, 0) / evaluations.length) * 10) / 10
    );
  }, [evaluations]);

  if (isLoading) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400 ${className}`}
      >
        <SparklesIcon className="w-3 h-3" />
        <span className="animate-pulse">…</span>
      </span>
    );
  }

  if (!avgScore || evaluations.length === 0) {
    return null;
  }

  return (
    <>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border cursor-pointer hover:opacity-80 transition-opacity ${getScoreBg(avgScore)} ${className}`}
            >
              <SparklesIcon className="w-3 h-3 text-purple-500 dark:text-purple-400" />
              <span className={`font-semibold ${getScoreColor(avgScore)}`}>{avgScore}/10</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                AI Evaluation
              </p>
              {evaluations.length === 1 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Score:{" "}
                  <span className={`font-semibold ${getScoreColor(evaluations[0].rating)}`}>
                    {evaluations[0].rating}/10
                  </span>
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {evaluations.map((evaluation, idx) => (
                      <span
                        key={idx}
                        className={`text-xs font-semibold ${getScoreColor(evaluation.rating)}`}
                      >
                        {evaluation.rating}/10
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Avg: {avgScore}/10</p>
                </>
              )}
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Click to view details</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isModalOpen && (
        <AIEvaluationApplicationModal
          referenceNumber={referenceNumber}
          milestoneTitle={milestoneTitle}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

// ─── Modal for application milestone evaluation details ─────────────────────

interface AIEvaluationApplicationModalProps {
  referenceNumber: string;
  milestoneTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

function AIEvaluationApplicationModal({
  referenceNumber,
  milestoneTitle,
  isOpen,
  onClose,
}: AIEvaluationApplicationModalProps) {
  const { data, isLoading, error, refetch } = useApplicationMilestoneEvaluation(
    referenceNumber,
    milestoneTitle,
    isOpen
  );
  const evaluations = data?.evaluations ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-white dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-black dark:text-white flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            AI Evaluation
          </DialogTitle>
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
              <div
                key={`${evaluation.milestoneUID}-${evaluation.createdAt}`}
                className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4"
              >
                <div className="flex items-center mb-3">
                  <div
                    className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                      evaluation.rating >= 8
                        ? "bg-green-100 dark:bg-green-900/20"
                        : evaluation.rating >= 5
                          ? "bg-yellow-100 dark:bg-yellow-900/20"
                          : "bg-red-100 dark:bg-red-900/20"
                    }`}
                  >
                    <span className={`text-lg font-bold ${getScoreColor(evaluation.rating)}`}>
                      {evaluation.rating}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">/ 10</span>
                  </div>
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
