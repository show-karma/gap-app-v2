import { useAttestationToast } from "@/hooks/useAttestationToast";
import { api } from "@/utilities/api/client";
import { HttpError, isApiError } from "@/utilities/api/errors";
import { envVars } from "@/utilities/enviromentVars";
import {
  INDEXING_TIMEOUT_MESSAGE,
  IndexingTimeoutError,
  OffChainRevokeError,
} from "@/utilities/errors";
import { INDEXER } from "@/utilities/indexer";
import { isAbortError, isRetryConditionNotMetError } from "@/utilities/retries";

/**
 * Hard cap on the revoke POST itself. Overrides the indexer-wide default
 * timeout (which exists for legacy long-poll endpoints) so a hung revoke
 * surfaces as a fast, actionable error instead of spinning for minutes
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
 * boolean to discard). The error is derived from the `api` client's typed
 * `ApiError`, not from which internal branch ran:
 *
 * - server responded with an error → an `HttpError` →
 *   `OffChainRevokeError("API_ERROR")` (toasted, `surfaced`).
 * - no response (network failure / internal timeout) → any other `ApiError`
 *   → `OffChainRevokeError("REQUEST_FAILED")` (toasted, `surfaced`), with the
 *   message normalized to a string before toasting.
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

    try {
      await api.post(
        INDEXER.PROJECT.REVOKE_ATTESTATION(uid, chainID),
        {},
        {
          baseURL: envVars.NEXT_PUBLIC_GAP_INDEXER_URL,
          signal: AbortSignal.timeout(REVOKE_REQUEST_TIMEOUT_MS),
        }
      );
    } catch (rawErr) {
      if (isApiError(rawErr) && rawErr instanceof HttpError) {
        // Server responded with an error — mirror the legacy fetchData
        // adapter's message extraction: prefer the response body's message,
        // then the underlying cause's message, then the synthetic HttpError
        // message.
        const bodyMessage = (rawErr.body as { message?: string } | undefined)?.message;
        const causeMessage = (rawErr.cause as { message?: string } | undefined)?.message;
        const message = bodyMessage || causeMessage || rawErr.message;
        showError(message);
        throw new OffChainRevokeError("API_ERROR", message, {
          uid,
          chainID,
          status: rawErr.status,
          surfaced: true,
        });
      }

      // No response: network failure or our own 30s request timeout. Because
      // this hook owns the only signal on the POST, an abort here is the
      // internal timeout, never user cancellation.
      const underlyingError = isApiError(rawErr) ? (rawErr.cause ?? rawErr) : rawErr;
      const isTimeout = isAbortError(underlyingError);
      const message = isTimeout
        ? "Revocation request timed out. Please try again."
        : normalizeErrorMessage(underlyingError);
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
        const message = INDEXING_TIMEOUT_MESSAGE;
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
