"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { TokenManager } from "@/utilities/auth/token-manager";
import type { BulkJobResponse, BulkJobStatus } from "../schemas/session.schema";
import { standaloneEvaluationService } from "../services/standaloneEvaluationService";
import { useEvaluationDraftStore } from "../store/evaluationDraftStore";
import { CREDITS_QUERY_KEYS } from "./useCredits";
import { EVALUATION_SESSION_KEYS } from "./useEvaluationSessions";

export const BULK_JOB_KEYS = {
  all: ["evaluation-bulk-jobs"] as const,
  job: (sessionId: string, jobId: string) => [...BULK_JOB_KEYS.all, sessionId, jobId] as const,
  result: (sessionId: string, jobId: string) =>
    [...BULK_JOB_KEYS.all, sessionId, jobId, "result"] as const,
  list: (sessionId: string) => [...BULK_JOB_KEYS.all, "list", sessionId] as const,
};

export const useBulkJobsList = (sessionId: string, enabled = true) => {
  return useQuery<BulkJobResponse[]>({
    queryKey: BULK_JOB_KEYS.list(sessionId),
    queryFn: () => standaloneEvaluationService.listBulkJobs(sessionId),
    enabled: Boolean(sessionId && enabled),
    staleTime: 30_000,
  });
};

export interface BulkResultData {
  columns: string[];
  rows: Record<string, unknown>[];
}

export const useBulkJobResult = (sessionId: string, jobId: string | null, enabled: boolean) => {
  return useQuery<BulkResultData>({
    queryKey: BULK_JOB_KEYS.result(sessionId, jobId ?? ""),
    queryFn: () => standaloneEvaluationService.getBulkResult(sessionId, jobId as string),
    enabled: Boolean(sessionId && jobId && enabled),
    // Result is immutable once a job is complete; cache forever.
    staleTime: Infinity,
  });
};

export interface BulkProgressState {
  status: BulkJobStatus | "IDLE" | "ERROR";
  totalApplications: number;
  completedApplications: number;
  failedApplications: number;
  hasResult: boolean;
  error: string | null;
}

const idleProgress: BulkProgressState = {
  status: "IDLE",
  totalApplications: 0,
  completedApplications: 0,
  failedApplications: 0,
  hasResult: false,
  error: null,
};

export const useStartBulkJob = () => {
  const queryClient = useQueryClient();
  const setActiveBulkJobId = useEvaluationDraftStore((s) => s.setActiveBulkJobId);

  return useMutation<
    BulkJobResponse,
    Error,
    { sessionId: string; file: File; notificationEmail?: string }
  >({
    mutationFn: ({ sessionId, file, notificationEmail }) =>
      standaloneEvaluationService.startBulkJob(sessionId, file, notificationEmail),
    onSuccess: (job, vars) => {
      toast.success("Bulk job started");
      setActiveBulkJobId(vars.sessionId, job.id);
      queryClient.invalidateQueries({
        queryKey: EVALUATION_SESSION_KEYS.detail(vars.sessionId),
      });
      queryClient.invalidateQueries({
        queryKey: BULK_JOB_KEYS.list(vars.sessionId),
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start bulk job");
    },
  });
};

export const useBulkJobStatus = (sessionId: string, jobId: string | null) => {
  return useQuery<BulkJobResponse>({
    queryKey: BULK_JOB_KEYS.job(sessionId, jobId ?? ""),
    queryFn: () => standaloneEvaluationService.getBulkJob(sessionId, jobId as string),
    enabled: Boolean(sessionId && jobId),
    staleTime: 0,
  });
};

interface SSEEvent {
  type: string;
  payload: Record<string, unknown>;
}

function parseSSE(chunk: string): SSEEvent[] {
  const out: SSEEvent[] = [];
  const blocks = chunk.replace(/\r\n/g, "\n").split("\n\n").filter(Boolean);
  for (const block of blocks) {
    let event = "message";
    let data = "";
    for (const rawLine of block.split("\n")) {
      const line = rawLine.trimEnd();
      if (!line || line.startsWith(":")) continue; // heartbeat / comment
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += (data ? "\n" : "") + line.slice(5).trimStart();
      }
    }
    if (data) {
      try {
        out.push({ type: event, payload: JSON.parse(data) });
      } catch {
        // skip malformed
      }
    }
  }
  return out;
}

/**
 * Subscribes to the BE's SSE progress stream. Reads events
 * `progress` { status, totalApplications, completedApplications, failedApplications }
 * and `done` { hasResult }, plus `:keepalive` heartbeats.
 *
 * Aborts cleanly on unmount or jobId change.
 *
 * Resilience: on transient failures (network drop, premature end of stream)
 * the hook reconnects with exponential backoff (1s, 2s, 4s, 8s, 16s, capped
 * at 30s) up to 5 retries. The retry counter resets on every successfully
 * consumed event, so long-running jobs don't accumulate retry budget over
 * hours. Surfaces ERROR only after retries are exhausted; never reconnects
 * after the `done` event or after user-initiated unmount.
 */
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

export const useBulkJobProgress = (sessionId: string, jobId: string | null) => {
  const [progress, setProgress] = useState<BulkProgressState>(idleProgress);
  const queryClient = useQueryClient();
  const setActiveBulkJobId = useEvaluationDraftStore((s) => s.setActiveBulkJobId);
  const controllerRef = useRef<AbortController | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);
  const doneReceivedRef = useRef(false);
  const unmountedRef = useRef(false);

  useEffect(() => {
    if (!sessionId || !jobId) {
      setProgress(idleProgress);
      return;
    }

    unmountedRef.current = false;
    retryAttemptRef.current = 0;
    doneReceivedRef.current = false;

    setProgress({ ...idleProgress, status: "PENDING" });

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const consume = async () => {
      if (unmountedRef.current) return;

      const controller = new AbortController();
      controllerRef.current = controller;

      // Tracks whether the stream produced any usable signal. A successful
      // open with at least one parsed event clears the retry budget; a
      // stream that closes before yielding anything is treated as a
      // transient failure and counts against retries.
      let receivedAnyEvent = false;
      let streamEndedCleanly = false;

      try {
        const token = await TokenManager.getToken();
        const url = standaloneEvaluationService.bulkProgressUrl(sessionId, jobId);
        const response = await fetch(url, {
          headers: {
            Accept: "text/event-stream",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            streamEndedCleanly = true;
            break;
          }
          buffer += decoder.decode(value, { stream: true });

          const lastBoundary = buffer.lastIndexOf("\n\n");
          if (lastBoundary < 0) continue;

          const consumable = buffer.slice(0, lastBoundary + 2);
          buffer = buffer.slice(lastBoundary + 2);
          const events = parseSSE(consumable);

          for (const event of events) {
            // Any successfully parsed event proves the connection is healthy.
            // Reset the retry budget so long-running jobs don't accumulate
            // retry count from earlier transient blips.
            receivedAnyEvent = true;
            retryAttemptRef.current = 0;

            if (event.type === "progress") {
              const p = event.payload as Partial<BulkProgressState>;
              setProgress((prev) => ({
                ...prev,
                status: (p.status as BulkJobStatus) ?? prev.status,
                totalApplications: p.totalApplications ?? prev.totalApplications,
                completedApplications: p.completedApplications ?? prev.completedApplications,
                failedApplications: p.failedApplications ?? prev.failedApplications,
              }));
            } else if (event.type === "done") {
              doneReceivedRef.current = true;
              const hasResult = Boolean((event.payload as { hasResult?: boolean }).hasResult);
              setProgress((prev) => ({
                ...prev,
                status: "COMPLETED",
                hasResult,
              }));
              queryClient.invalidateQueries({ queryKey: CREDITS_QUERY_KEYS.all });
              queryClient.invalidateQueries({
                queryKey: EVALUATION_SESSION_KEYS.detail(sessionId),
              });
              queryClient.invalidateQueries({
                queryKey: BULK_JOB_KEYS.job(sessionId, jobId),
              });
              queryClient.invalidateQueries({
                queryKey: BULK_JOB_KEYS.list(sessionId),
              });
            } else if (event.type === "error") {
              // Suppress reconnect — server-reported failure is terminal.
              doneReceivedRef.current = true;
              const msg = (event.payload as { message?: string }).message ?? "Bulk job failed";
              setProgress((prev) => ({ ...prev, status: "FAILED", error: msg }));
            }
          }
        }
      } catch (err) {
        // User-initiated abort (unmount, jobId/sessionId change): never retry.
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (controller.signal.aborted) return;

        const message = err instanceof Error ? err.message : "Connection lost";
        scheduleReconnectOrFail(message);
        return;
      }

      // Stream closed without throwing. Two cases:
      //   1) `done` event received → terminal success, do nothing.
      //   2) Premature end of stream → treat as transient and reconnect.
      if (doneReceivedRef.current) return;
      if (streamEndedCleanly && !unmountedRef.current && !controller.signal.aborted) {
        scheduleReconnectOrFail(
          receivedAnyEvent ? "Connection lost" : "Stream ended without completion"
        );
      }
    };

    const scheduleReconnectOrFail = (message: string) => {
      if (unmountedRef.current) return;
      if (doneReceivedRef.current) return;

      if (retryAttemptRef.current >= MAX_RETRIES) {
        setProgress((prev) => ({ ...prev, status: "ERROR", error: message }));
        return;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s — capped at 30s.
      const delay = Math.min(BASE_BACKOFF_MS * 2 ** retryAttemptRef.current, MAX_BACKOFF_MS);
      retryAttemptRef.current += 1;

      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (unmountedRef.current || doneReceivedRef.current) return;
        consume();
      }, delay);
    };

    consume();

    return () => {
      unmountedRef.current = true;
      clearReconnectTimer();
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [sessionId, jobId, queryClient]);

  const dismiss = () => {
    if (sessionId) setActiveBulkJobId(sessionId, null);
    setProgress(idleProgress);
  };

  return { progress, dismiss };
};
