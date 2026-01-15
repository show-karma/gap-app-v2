"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportedChainId } from "@/config/tokens";
import { getTransactionStatus, type SafeTransactionStatus } from "@/utilities/safe";
import { useUpdateDisbursementStatus } from "./use-payout-disbursement";
import { PayoutDisbursementStatus } from "../types/payout-disbursement";

const POLLING_INTERVAL_MS = 30_000; // 30 seconds

export interface TransactionPollerState {
  isPolling: boolean;
  status: SafeTransactionStatus | null;
  error: string | null;
  lastChecked: Date | null;
}

export interface UseTransactionStatusPollerParams {
  safeTxHash: string | null;
  chainId: SupportedChainId;
  disbursementIds: string[];
  enabled?: boolean;
  onExecuted?: () => void;
  onFailed?: () => void;
}

export interface UseTransactionStatusPollerReturn {
  state: TransactionPollerState;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Hook for polling Safe transaction status and updating disbursement status when executed
 *
 * Polls the Safe Transaction Service every 30 seconds to check if a transaction
 * has been executed. When executed successfully, updates all associated disbursements
 * to DISBURSED status. When execution fails, updates them to FAILED status.
 *
 * @param params - Polling parameters
 * @returns Polling state and control functions
 *
 * @example
 * ```typescript
 * const { state, startPolling, stopPolling } = useTransactionStatusPoller({
 *   safeTxHash: "0x1234...abcd",
 *   chainId: 10,
 *   disbursementIds: ["id1", "id2"],
 *   enabled: true,
 *   onExecuted: () => {
 *     toast.success("Disbursement executed!");
 *     refetchData();
 *   },
 * });
 *
 * // State contains: isPolling, status, error, lastChecked
 * if (state.status?.isExecuted) {
 *   console.log("Transaction executed!");
 * }
 * ```
 */
export function useTransactionStatusPoller({
  safeTxHash,
  chainId,
  disbursementIds,
  enabled = true,
  onExecuted,
  onFailed,
}: UseTransactionStatusPollerParams): UseTransactionStatusPollerReturn {
  const [state, setState] = useState<TransactionPollerState>({
    isPolling: false,
    status: null,
    error: null,
    lastChecked: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const hasCompletedRef = useRef(false);

  const updateDisbursementStatusMutation = useUpdateDisbursementStatus();

  /**
   * Updates all disbursements with the given status
   */
  const updateAllDisbursements = useCallback(
    async (status: PayoutDisbursementStatus, errorMessage?: string) => {
      const updatePromises = disbursementIds.map((id) =>
        updateDisbursementStatusMutation.mutateAsync({
          disbursementId: id,
          request: {
            status,
            ...(errorMessage && { errorMessage }),
          },
        })
      );

      try {
        await Promise.all(updatePromises);
      } catch (error) {
        console.error("Error updating disbursement statuses:", error);
      }
    },
    [disbursementIds, updateDisbursementStatusMutation]
  );

  /**
   * Checks transaction status and handles state transitions
   */
  const checkStatus = useCallback(async () => {
    if (!safeTxHash || hasCompletedRef.current) {
      return;
    }

    try {
      const status = await getTransactionStatus(safeTxHash, chainId);

      setState((prev) => ({
        ...prev,
        status,
        error: null,
        lastChecked: new Date(),
      }));

      // Handle execution completion
      if (status.isExecuted) {
        hasCompletedRef.current = true;

        if (status.isSuccessful) {
          await updateAllDisbursements(PayoutDisbursementStatus.DISBURSED);
          onExecuted?.();
        } else {
          await updateAllDisbursements(
            PayoutDisbursementStatus.FAILED,
            "Transaction execution failed on-chain"
          );
          onFailed?.();
        }

        // Stop polling after status change
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        isPollingRef.current = false;
        setState((prev) => ({ ...prev, isPolling: false }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        lastChecked: new Date(),
      }));
    }
  }, [safeTxHash, chainId, updateAllDisbursements, onExecuted, onFailed]);

  /**
   * Starts polling for transaction status
   */
  const startPolling = useCallback(() => {
    if (isPollingRef.current || !safeTxHash || hasCompletedRef.current) {
      return;
    }

    isPollingRef.current = true;
    setState((prev) => ({ ...prev, isPolling: true, error: null }));

    // Check immediately
    checkStatus();

    // Set up interval for subsequent checks
    intervalRef.current = setInterval(checkStatus, POLLING_INTERVAL_MS);
  }, [safeTxHash, checkStatus]);

  /**
   * Stops polling for transaction status
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPollingRef.current = false;
    setState((prev) => ({ ...prev, isPolling: false }));
  }, []);

  // Start/stop polling based on enabled prop and safeTxHash
  useEffect(() => {
    if (enabled && safeTxHash && !hasCompletedRef.current) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, safeTxHash, startPolling, stopPolling]);

  // Reset completed state when safeTxHash changes
  useEffect(() => {
    hasCompletedRef.current = false;
    setState({
      isPolling: false,
      status: null,
      error: null,
      lastChecked: null,
    });
  }, [safeTxHash]);

  return {
    state,
    startPolling,
    stopPolling,
  };
}
