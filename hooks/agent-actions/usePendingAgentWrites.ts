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
  previousPending?: PendingAgentWritesList;
}

/** Removes `id` from the cached pending list and returns the prior snapshot. */
function optimisticallyRemove(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string
): OptimisticContext {
  const key = agentActionsKeys.list("pending");
  const previousPending = queryClient.getQueryData<PendingAgentWritesList>(key);
  if (previousPending) {
    queryClient.setQueryData<PendingAgentWritesList>(key, {
      ...previousPending,
      writes: previousPending.writes.filter((w) => w.id !== id),
      total: Math.max(0, previousPending.total - 1),
    });
  }
  return { previousPending };
}

function handleDecisionError(
  queryClient: ReturnType<typeof useQueryClient>,
  error: unknown,
  context: OptimisticContext | undefined,
  logLabel: string,
  genericToast: string
): void {
  if (context?.previousPending) {
    queryClient.setQueryData(agentActionsKeys.list("pending"), context.previousPending);
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
      return optimisticallyRemove(queryClient, write.id);
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
      return optimisticallyRemove(queryClient, write.id);
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
