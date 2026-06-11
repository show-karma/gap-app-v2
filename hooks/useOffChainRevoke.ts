import { useAttestationToast } from "@/hooks/useAttestationToast";
import { envVars } from "@/utilities/enviromentVars";
import { IndexingTimeoutError, OffChainRevokeError } from "@/utilities/errors";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { isAbortError, isRetryConditionNotMetError } from "@/utilities/retries";

/**
 * Hard cap on the revoke POST itself. Overrides the indexer-wide 360s ceiling
 * in `fetchData` (which exists for legacy long-poll endpoints) so a hung
 * revoke surfaces as a fast, actionable error instead of spinning for minutes
 * behind a button the user is staring at.
 */
const REVOKE_REQUEST_TIMEOUT_MS = 30_000;

interface UseOffChainRevokeOptions {
  uid: `0x${string}`;
  chainID: number;
  /**
   * Optional indexing-poll closure injected by the caller. It runs AFTER the
   * revoke is accepted and is expected to throw `RetryConditionNotMetError` on
   * exhaustion (which we map to `IndexingTimeoutError`) or a `RetryAbortedError`
   * on caller-owned cancellation (which we pass through untouched).
   */
  checkIfExists?: () => Promise<void>;
  toastMessages?: {
    success: string;
    loading: string;
  };
}

type AttestationToast = ReturnType<typeof useAttestationToast>;

const normalizeErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Off-chain attestation revoke primitive.
 *
 * **Contract: throws on failure.** `performOffChainRevoke` resolves to `void`
 * on success and rejects with a typed error on any failure. Callers MUST wrap
 * it in try/catch — failure can no longer be silently ignored (there is no
 * boolean to discard). The error is derived from `fetchData`'s tuple SHAPE,
 * not from which internal branch ran:
 *
 * - server responded with an error → `res[1]` is a STRING →
 *   `OffChainRevokeError("API_ERROR")` (toasted, `surfaced`).
 * - no response (network failure / internal timeout) → `res[1]` is the raw
 *   `Error` object → `OffChainRevokeError("REQUEST_FAILED")` (toasted,
 *   `surfaced`), with the message normalized to a string before toasting.
 * - injected `checkIfExists` exhausts its budget → `IndexingTimeoutError`.
 * - injected `checkIfExists` is cancelled by the caller → the abort error is
 *   rethrown untouched, no toast (the user navigated away).
 *
 * Pass the caller's own `useAttestationToast` instance via `injectedToast` so a
 * single `toastIdRef` drives one updating toast instead of two stacked ones.
 */
export const useOffChainRevoke = (injectedToast?: AttestationToast) => {
  // Hooks rules: call unconditionally, then prefer the injected instance so the
  // caller and this primitive share one toast.
  const ownToast = useAttestationToast();
  const { showLoading, showSuccess, showError, dismiss } = injectedToast ?? ownToast;

  const performOffChainRevoke = async ({
    uid,
    chainID,
    checkIfExists,
    toastMessages,
  }: UseOffChainRevokeOptions): Promise<void> => {
    showLoading(toastMessages?.loading || "Revoking attestation...");

    const [, error, , status] = await fetchData(
      INDEXER.PROJECT.REVOKE_ATTESTATION(uid, chainID),
      "POST",
      {},
      {},
      {},
      true,
      false,
      envVars.NEXT_PUBLIC_GAP_INDEXER_URL,
      AbortSignal.timeout(REVOKE_REQUEST_TIMEOUT_MS)
    );

    if (error) {
      if (typeof error === "string") {
        // Server responded with an error — `fetchData` put the message string
        // in the tuple along with the HTTP status.
        showError(error);
        throw new OffChainRevokeError("API_ERROR", error, {
          uid,
          chainID,
          status,
          surfaced: true,
        });
      }

      // No response: network failure or our own 30s request timeout. Because
      // this hook owns the only signal on the POST, a tuple-path cancellation
      // here is the internal timeout, never user cancellation.
      const isTimeout = isAbortError(error);
      const message = isTimeout
        ? "Revocation request timed out. Please try again."
        : normalizeErrorMessage(error);
      showError(message);
      throw new OffChainRevokeError("REQUEST_FAILED", message, {
        uid,
        chainID,
        surfaced: true,
      });
    }

    try {
      await checkIfExists?.();
    } catch (pollError) {
      // The poll is the only thing that throws here. Caller-owned cancellation
      // (the documented `retryUntilConditionMet` abort contract) passes through
      // silently; budget exhaustion becomes an actionable indexing timeout.
      if (isAbortError(pollError)) {
        dismiss();
        throw pollError;
      }
      if (isRetryConditionNotMetError(pollError)) {
        const message =
          "Revocation was submitted but hasn't been indexed yet — please refresh in a moment.";
        showError(message);
        throw new IndexingTimeoutError(message, { uid, chainID, surfaced: true });
      }
      dismiss();
      throw new OffChainRevokeError("REQUEST_FAILED", normalizeErrorMessage(pollError), {
        uid,
        chainID,
        surfaced: false,
      });
    }

    if (toastMessages?.success) {
      showSuccess(toastMessages.success);
    } else {
      dismiss();
    }
  };

  return { performOffChainRevoke };
};
