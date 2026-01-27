"use client";

import type { BulkEvaluationJob, PromptType } from "../../types/program-prompt";
import { BulkEvaluationProgress } from "../BulkEvaluationProgress";

interface BulkEvaluationSectionProps {
  programId: string;
  promptType: PromptType;
  activeJob: BulkEvaluationJob | null;
  bulkEvaluationJob?: {
    id: string;
    status: "pending" | "running" | "completed" | "failed";
    totalApplications: number;
    completedApplications: number;
    failedApplications: number;
    errorApplicationId?: string | null;
    errorMessage?: string | null;
    startedAt: string;
    completedAt?: string | null;
    triggeredBy: string;
    programId: string;
    promptType: PromptType;
  } | null;
  onRetry: () => void;
}

export function BulkEvaluationSection({
  programId,
  promptType,
  activeJob,
  bulkEvaluationJob,
  onRetry,
}: BulkEvaluationSectionProps) {
  const job = activeJob ?? bulkEvaluationJob ?? null;

  if (!job || !job.status) {
    return null;
  }

  return (
    <BulkEvaluationProgress
      job={{
        id: job.id,
        programId,
        promptType,
        status: job.status,
        totalApplications: job.totalApplications || 0,
        completedApplications: job.completedApplications || 0,
        failedApplications: job.failedApplications || 0,
        errorApplicationId: job.errorApplicationId,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt || new Date().toISOString(),
        completedAt: job.completedAt,
        triggeredBy: job.triggeredBy || "",
      }}
      onRetry={onRetry}
    />
  );
}
