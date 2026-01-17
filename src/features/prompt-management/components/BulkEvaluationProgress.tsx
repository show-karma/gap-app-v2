"use client";

import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import type { BulkEvaluationJob } from "../types/program-prompt";

interface BulkEvaluationProgressProps {
  job: BulkEvaluationJob;
  onRetry?: () => void;
}

export function BulkEvaluationProgress({ job, onRetry }: BulkEvaluationProgressProps) {
  const progress =
    job.totalApplications > 0
      ? Math.round((job.completedApplications / job.totalApplications) * 100)
      : 0;

  const isRunning = job.status === "pending" || job.status === "running";
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        {isRunning && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
        {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-500" />}
        {isFailed && <AlertCircle className="w-5 h-5 text-red-500" />}

        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {isRunning && "Evaluating Applications..."}
            {isCompleted && "Bulk Evaluation Complete"}
            {isFailed && "Evaluation Failed"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {job.completedApplications} of {job.totalApplications} applications processed
          </p>
        </div>

        {isFailed && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isFailed ? "bg-red-500" : isCompleted ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Error message */}
      {isFailed && job.errorMessage && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-xs text-red-700 dark:text-red-300">
            <span className="font-medium">Error:</span> {job.errorMessage}
          </p>
          {job.errorApplicationId && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              <span className="font-medium">Application ID:</span>{" "}
              <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">
                {job.errorApplicationId}
              </code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
