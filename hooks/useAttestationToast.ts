import { useCallback, useRef } from "react";
import toast from "react-hot-toast";

export type AttestationStep = "preparing" | "pending" | "confirmed" | "indexing" | "indexed";

/**
 * @deprecated Use AttestationStep instead
 */
export type TxStepperSteps = AttestationStep;

const stepMessages: Record<AttestationStep, string> = {
  preparing: "Preparing attestation...",
  pending: "Waiting for wallet signature...",
  confirmed: "Transaction confirmed, processing...",
  indexing: "Indexing data on-chain...",
  indexed: "Complete!",
};

/**
 * Hook for managing attestation progress with toast notifications.
 * This is the primary way to show progress for blockchain attestation operations.
 *
 * Toast timing:
 * - No toast shown during `preparing` or `pending` (wallet is loading/showing popup)
 * - First toast appears on `confirmed` (user signed, transaction submitted)
 * - Toast updates to "Indexing..." on `indexing` step
 * - `indexed` step is ignored - use `showSuccess` after verifying data
 *
 * Usage:
 * ```tsx
 * const { startAttestation, showSuccess, showError, updateStep, dismiss } = useAttestationToast();
 *
 * try {
 *   startAttestation("Creating project..."); // Sets message, no toast yet
 *   await attestation.attest(signer, data, updateStep); // Toast shows on 'confirmed'
 *   await verifyDataIndexed(); // Wait for actual data
 *   showSuccess("Project created!"); // Show success after verification
 * } catch (error) {
 *   showError("Failed to create project");
 * } finally {
 *   dismiss(); // Clean up any remaining toast
 * }
 * ```
 */
export function useAttestationToast() {
  const toastIdRef = useRef<string | null>(null);
  const pendingMessageRef = useRef<string | null>(null);

  /**
   * Prepare the attestation flow with a custom message.
   * Does NOT show a toast immediately - the first toast appears when the user
   * confirms the transaction in their wallet (on 'confirmed' step).
   *
   * @param customMessage - Message to show when transaction is confirmed
   */
  const startAttestation = useCallback((customMessage?: string) => {
    pendingMessageRef.current = customMessage || stepMessages.confirmed;
  }, []);

  /**
   * Show a loading toast with custom message.
   * If a toast already exists, it will be updated.
   */
  const showLoading = useCallback((message: string) => {
    if (toastIdRef.current) {
      toast.loading(message, { id: toastIdRef.current });
    } else {
      toastIdRef.current = toast.loading(message);
    }
  }, []);

  /**
   * Update the toast with a step message (for SDK callbacks).
   * Can accept either an AttestationStep or a custom string message.
   * This function can be passed directly to SDK methods as a callback.
   *
   * Step handling:
   * - `preparing`/`pending`: No toast (wallet loading/popup)
   * - `confirmed`: Show first toast with pending message
   * - `indexing`: Update to "Indexing..." message
   * - `indexed`: Ignored - use showSuccess after data verification
   */
  const updateStep = useCallback((step: AttestationStep | string) => {
    // Skip preparing and pending - no toast during wallet interaction
    if (step === "preparing" || step === "pending") {
      return;
    }

    // Skip indexed - let showSuccess handle final state after data verification
    if (step === "indexed") {
      return;
    }

    // On confirmed: show first toast with the stored message
    if (step === "confirmed") {
      const message = pendingMessageRef.current || stepMessages.confirmed;
      if (toastIdRef.current) {
        toast.loading(message, { id: toastIdRef.current });
      } else {
        toastIdRef.current = toast.loading(message);
      }
      return;
    }

    // For indexing or custom string messages
    const message = stepMessages[step as AttestationStep] || step;

    if (toastIdRef.current) {
      toast.loading(message, { id: toastIdRef.current });
    } else {
      toastIdRef.current = toast.loading(message);
    }
  }, []);

  /**
   * Legacy alias for updateStep - used by SDK callbacks.
   * @deprecated Use updateStep instead
   */
  const changeStepperStep = updateStep;

  /**
   * Legacy alias for dismiss - for migration compatibility.
   * @deprecated Use dismiss instead
   */
  const setIsStepper = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      pendingMessageRef.current = null;
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, []);

  /**
   * Show success and dismiss the loading toast.
   * Call this after verifying data has been indexed.
   */
  const showSuccess = useCallback((message: string) => {
    pendingMessageRef.current = null;
    if (toastIdRef.current) {
      toast.success(message, { id: toastIdRef.current, duration: 3000 });
      toastIdRef.current = null;
    } else {
      toast.success(message, { duration: 3000 });
    }
  }, []);

  /**
   * Show error and dismiss the loading toast.
   */
  const showError = useCallback((message: string) => {
    pendingMessageRef.current = null;
    if (toastIdRef.current) {
      toast.error(message, { id: toastIdRef.current, duration: 5000 });
      toastIdRef.current = null;
    } else {
      toast.error(message, { duration: 5000 });
    }
  }, []);

  /**
   * Dismiss any active toast without showing success/error.
   */
  const dismiss = useCallback(() => {
    pendingMessageRef.current = null;
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, []);

  /**
   * Show multi-chain progress in a single updating toast.
   * Use this for operations spanning multiple chains instead of multiple toasts.
   *
   * @param action - The action being performed (e.g., "Creating milestone", "Deleting")
   * @param chainName - Current chain name (e.g., "Optimism")
   * @param current - Current chain number (1-based)
   * @param total - Total number of chains
   * @param itemCount - Optional number of items on this chain (e.g., "2 milestone(s)")
   *
   * @example
   * showChainProgress("Creating milestone", "Optimism", 1, 3);
   * // Shows: "Creating milestone on Optimism (1/3)..."
   *
   * showChainProgress("Deleting", "Arbitrum", 2, 3, 2);
   * // Shows: "Deleting 2 milestone(s) on Arbitrum (2/3)..."
   */
  const showChainProgress = useCallback(
    (action: string, chainName: string, current: number, total: number, itemCount?: number) => {
      const itemText = itemCount && itemCount > 1 ? `${itemCount} milestone(s) ` : "";
      const message = `${action} ${itemText}on ${chainName} (${current}/${total})...`;

      if (toastIdRef.current) {
        toast.loading(message, { id: toastIdRef.current });
      } else {
        toastIdRef.current = toast.loading(message);
      }
    },
    []
  );

  return {
    startAttestation,
    showLoading,
    showSuccess,
    showError,
    updateStep,
    changeStepperStep,
    setIsStepper,
    dismiss,
    showChainProgress,
  };
}
