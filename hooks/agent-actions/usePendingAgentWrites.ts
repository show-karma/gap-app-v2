"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import {
  type PendingAgentWrite,
  type PendingAgentWritesList,
  type PendingAgentWritesStatusFilter,
  pendingAgentWritesService,
} from "@/services/pending-agent-writes.service";
import { HttpError } from "@/utilities/api/errors";

/**
 * React Query bindings for the "Pending agent actions" dashboard surface.
 *
 * Approve/reject are optimistic (the row is removed from the pending list on
 * mutate and restored on error). A 409 means the server already decided the
 * write (approved elsewhere, expired, etc.) — we surface a friendly "already
 * decided" toast and refetch rather than a scary error.
 */

const AGENT_ACTIONS_ROOT = ["agent-actions", "pending-writes"] as const;

export const agentActionsKeys = {
  all: AGENT_ACTIONS_ROOT,
  list: (status: PendingAgentWritesStatusFilter) => [...AGENT_ACTIONS_ROOT, status] as const,
};

export function usePendingAgentWrites(status: PendingAgentWritesStatusFilter, enabled = true) {
  return useQuery({
    queryKey: agentActionsKeys.list(status),
    queryFn: () => pendingAgentWritesService.list(status),
    enabled,
    retry: 1,
    staleTime: 15_000,
  });
}

interface OptimisticContext {
  removed?: { write: PendingAgentWrite; index: number };
}

/**
 * Removes `write` from the cached pending list via a functional updater (safe
 * when approve/reject of different rows overlap) and returns what was removed
 * so rollback can restore ONLY that row, never a whole stale snapshot.
 */
function optimisticallyRemove(
  queryClient: ReturnType<typeof useQueryClient>,
  write: PendingAgentWrite
): OptimisticContext {
  const key = agentActionsKeys.list("pending");
  let removed: OptimisticContext["removed"];
  queryClient.setQueryData<PendingAgentWritesList>(key, (current) => {
    if (!current) return current;
    const index = current.writes.findIndex((w) => w.id === write.id);
    if (index === -1) return current;
    removed = { write, index };
    return {
      ...current,
      writes: current.writes.filter((w) => w.id !== write.id),
      total: Math.max(0, current.total - 1),
    };
  });
  return { removed };
}

function handleDecisionError(
  queryClient: ReturnType<typeof useQueryClient>,
  error: unknown,
  context: OptimisticContext | undefined,
  logLabel: string,
  genericToast: string
): void {
  const removed = context?.removed;
  if (removed) {
    // Re-insert only the failed row, at its old position, and only if a
    // concurrent decision has not already re-added or re-fetched it.
    queryClient.setQueryData<PendingAgentWritesList>(
      agentActionsKeys.list("pending"),
      (current) => {
        if (!current || current.writes.some((w) => w.id === removed.write.id)) return current;
        const writes = [...current.writes];
        writes.splice(Math.min(removed.index, writes.length), 0, removed.write);
        return { ...current, writes, total: current.total + 1 };
      }
    );
  }
  // Already decided (approved elsewhere, expired, or double-submit) — not an
  // error the user needs to worry about, just a stale view. Refresh quietly.
  if (error instanceof HttpError && error.status === 409) {
    toast("This action was already decided. Refreshing your queue.");
    void queryClient.invalidateQueries({ queryKey: agentActionsKeys.all });
    return;
  }
  errorManager(logLabel, error);
  toast.error(genericToast);
}

export function useApproveAgentWrite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (write: PendingAgentWrite) => pendingAgentWritesService.approve(write.id),
    onMutate: async (write) => {
      await queryClient.cancelQueries({ queryKey: agentActionsKeys.all });
      return optimisticallyRemove(queryClient, write);
    },
    onError: (error, _write, context) => {
      handleDecisionError(
        queryClient,
        error,
        context,
        "Failed to approve agent action",
        "Could not approve this action. Please try again."
      );
    },
    onSuccess: (response) => {
      if (response.status === "failed") {
        toast.error(
          response.result?.error
            ? `Approved, but the action failed to execute: ${response.result.error}`
            : "Approved, but the action failed to execute."
        );
        return;
      }
      toast.success("Action approved and executed.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: agentActionsKeys.all });
    },
  });
}

export function useRejectAgentWrite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (write: PendingAgentWrite) => pendingAgentWritesService.reject(write.id),
    onMutate: async (write) => {
      await queryClient.cancelQueries({ queryKey: agentActionsKeys.all });
      return optimisticallyRemove(queryClient, write);
    },
    onError: (error, _write, context) => {
      handleDecisionError(
        queryClient,
        error,
        context,
        "Failed to reject agent action",
        "Could not reject this action. Please try again."
      );
    },
    onSuccess: () => {
      toast.success("Action rejected.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: agentActionsKeys.all });
    },
  });
}
