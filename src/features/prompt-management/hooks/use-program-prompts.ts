"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { programPromptService } from "../services/program-prompt.service";
import type {
  BulkEvaluationJob,
  ProgramPrompt,
  PromptType,
  SaveProgramPromptRequest,
  TestProgramPromptRequest,
  TestProgramPromptResult,
  TriggerBulkEvaluationResult,
} from "../types/program-prompt";

/**
 * Query key factory for program prompt queries
 */
export const promptKeys = {
  all: ["prompts"] as const,
  program: (programId: string) => [...promptKeys.all, programId] as const,
  jobs: ["prompt-jobs"] as const,
  job: (programId: string, jobId: string) => [...promptKeys.jobs, programId, jobId] as const,
} as const;

/**
 * Hook for fetching program prompts
 *
 * @param programId - The program ID
 * @param options - Optional settings
 */
export function useProgramPrompts(
  programId: string,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: promptKeys.program(programId),
    queryFn: () => programPromptService.getPrompts(programId),
    enabled: options?.enabled ?? !!programId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for saving a program prompt
 *
 * @param programId - The program ID
 * @param promptType - Either 'external' or 'internal'
 * @param options - Optional callbacks
 */
export function useSavePrompt(
  programId: string,
  promptType: PromptType,
  options?: {
    onSuccess?: (data: ProgramPrompt) => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SaveProgramPromptRequest) =>
      programPromptService.savePrompt(programId, promptType, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: promptKeys.program(programId) });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Hook for testing a prompt
 *
 * @param programId - The program ID
 * @param promptType - Either 'external' or 'internal'
 * @param options - Optional callbacks
 */
export function useTestPrompt(
  programId: string,
  promptType: PromptType,
  options?: {
    onSuccess?: (data: TestProgramPromptResult) => void;
    onError?: (error: Error) => void;
  }
) {
  return useMutation({
    mutationFn: (data: TestProgramPromptRequest) =>
      programPromptService.testPrompt(programId, promptType, data),
    onSuccess: (data) => {
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Hook for triggering bulk evaluation
 *
 * @param programId - The program ID
 * @param options - Optional callbacks
 */
export function useTriggerBulkEvaluation(
  programId: string,
  options?: {
    onSuccess?: (data: TriggerBulkEvaluationResult) => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (promptType: PromptType) =>
      programPromptService.triggerBulkEvaluation(programId, promptType),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: promptKeys.jobs });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Hook for fetching bulk evaluation job status
 *
 * @param programId - The program ID
 * @param jobId - The job ID
 * @param options - Optional settings
 */
export function useBulkEvaluationJob(
  programId: string,
  jobId: string | null,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
  }
) {
  return useQuery({
    queryKey: promptKeys.job(programId, jobId ?? ""),
    queryFn: () => programPromptService.getJobStatus(programId, jobId!),
    enabled: !!jobId && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval ?? false,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for polling bulk evaluation job status
 *
 * Uses refs to prevent stale closures and memory leaks, and ensures
 * the onComplete callback is only called once per job completion.
 *
 * @param programId - The program ID
 * @param jobId - The job ID
 * @param options - Optional settings
 */
export function useBulkEvaluationJobPolling(
  programId: string,
  jobId: string | null,
  options?: {
    onComplete?: (job: BulkEvaluationJob) => void;
  }
) {
  // Use refs to hold latest callback values without causing stale closures
  const onCompleteRef = useRef(options?.onComplete);
  const hasCalledOnComplete = useRef(false);

  // Keep ref in sync with latest callback
  useEffect(() => {
    onCompleteRef.current = options?.onComplete;
  }, [options?.onComplete]);

  // Reset completion flag when jobId changes
  useEffect(() => {
    hasCalledOnComplete.current = false;
  }, [jobId]);

  return useQuery({
    queryKey: promptKeys.job(programId, jobId ?? ""),
    queryFn: () => programPromptService.getJobStatus(programId, jobId!),
    enabled: !!jobId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 5000;
      if (data.status === "completed" || data.status === "failed") {
        // Only call onComplete once per job
        if (!hasCalledOnComplete.current) {
          hasCalledOnComplete.current = true;
          onCompleteRef.current?.(data);
        }
        return false;
      }
      return 5000;
    },
  });
}
