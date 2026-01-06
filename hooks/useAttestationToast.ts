import { useCallback, useRef } from "react";
import toast from "react-hot-toast";

export type AttestationStep = "preparing" | "pending" | "confirmed" | "indexing" | "indexed";

/**
 * @deprecated Use AttestationStep instead
 */
export type TxStepperSteps = AttestationStep;

const stepMessages: Record<AttestationStep, string> = {
  preparing: "Preparing transaction...",
  pending: "Waiting for signature...",
  confirmed: "Transaction confirmed...",
  indexing: "Indexing data...",
  indexed: "Complete!",
};

/**
 * Hook for managing attestation progress with toast notifications.
 * This is the primary way to show progress for blockchain attestation operations.
 *
 * Usage:
 * ```tsx
 * const { showLoading, showSuccess, showError, updateStep, dismiss } = useAttestationToast();
 *
 * try {
 *   // Update progress step (for SDK callbacks)
 *   await attestation.attest(signer, data, updateStep);
 *
 *   // Show success when done
 *   showSuccess("Attestation created!");
 * } catch (error) {
 *   showError("Failed to create attestation");
 * } finally {
 *   dismiss(); // Clean up any remaining toast
 * }
 * ```
 */
export function useAttestationToast() {
  const toastIdRef = useRef<string | null>(null);

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
   */
  const updateStep = useCallback((step: AttestationStep | string) => {
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
    if (!isOpen && toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, []);

  /**
   * Show success and dismiss the loading toast.
   */
  const showSuccess = useCallback((message: string) => {
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
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, []);

  return {
    showLoading,
    showSuccess,
    showError,
    updateStep,
    changeStepperStep,
    setIsStepper,
    dismiss,
  };
}
