import * as Sentry from "@sentry/nextjs";
import { type ApiError, isApiError, isTransientApiError } from "@/utilities/api/errors";
import { reportApiFailure } from "@/utilities/api/report";
import { isTransientHttpError, isTransientNetworkError } from "@/utilities/sentry/transientErrors";

// Lazy import toast to avoid issues in server components
let toast: typeof import("react-hot-toast").default | null = null;

const getToast = () => {
  // Only import and use toast in browser/client environment
  if (typeof window === "undefined") {
    return null;
  }
  if (!toast) {
    try {
      toast = require("react-hot-toast").default;
    } catch (_e) {
      // Toast not available, return null
      return null;
    }
  }
  return toast;
};

// Checks whether the error's code/message (or its originalError's code/message)
// contains a given substring, case-insensitive. Centralizes the triple-
// optional-chain pattern used throughout this module so the main function
// stays under biome's cognitive-complexity ceiling.
type ErrorLike = {
  code?: string;
  message?: string;
  originalError?: { code?: string; message?: string };
};
const errorContains = (error: ErrorLike | null | undefined, needle: string): boolean => {
  const n = needle.toLowerCase();
  return (
    !!error?.originalError?.code?.toLowerCase()?.includes(n) ||
    !!error?.originalError?.message?.toLowerCase()?.includes(n) ||
    !!error?.message?.toLowerCase()?.includes(n)
  );
};

// Fires the standard "Try again shortly" failure toast. Shared by the typed
// ApiError branch and the legacy wallet-error fallback below so both paths
// give the user the same feedback for a failed action.
const fireErrorToast = (message: string): void => {
  getToast()?.error(
    `${message} Try again shortly. If you continue to have trouble, please message us on Telegram: t.me/karmahq`
  );
};

// Handles a typed ApiError (issue #1775): fires the caller's toastError (same
// as the legacy string-error path below), then either breadcrumbs a
// transient failure or routes a genuine one through reportApiFailure's
// per-endpoint fingerprinting. Extracted (rather than inlined in
// errorManager) to keep the main function under biome's cognitive-complexity
// ceiling.
const handleApiError = (
  error: ApiError,
  errorMessage: string,
  extra: any,
  toastError?: { error?: string }
): void => {
  if (toastError?.error) {
    fireErrorToast(toastError.error);
  }
  if (isTransientApiError(error)) {
    Sentry.addBreadcrumb({ category: "api", message: error.message, level: "warning" });
    return;
  }
  reportApiFailure(error, { errorMessage, extra });
};

// Handles the "switch chain" wallet error case: toasts a network-switch
// hint and reports whether the caller should return early. Extracted
// (alongside errorContains) to keep errorManager under biome's
// cognitive-complexity ceiling.
const handleSwitchChainError = (
  error: ErrorLike | null | undefined,
  extra?: { targetNetwork?: string }
): boolean => {
  if (!errorContains(error, "switch chain")) {
    return false;
  }
  const toastInstance = getToast();
  if (toastInstance) {
    toastInstance.error(
      `we couldn't switch to "${extra?.targetNetwork}" network in your wallet. Please manually switch network and try again`
    );
  }
  return true;
};

// Expected user/lifecycle states (e.g. SignerUnavailableError for a wallet
// that hasn't connected/hydrated yet) are guidance, not defects — never
// report them to Sentry. Duck-typed on `expected` to avoid an import cycle
// with the ~40 attestation flows that call errorManager in their catches.
// Extracted (rather than inlined in errorManager) to keep the main
// function under biome's cognitive-complexity ceiling.
const handleExpectedError = (error: unknown, toastError?: { error?: string }): boolean => {
  if ((error as { expected?: boolean } | null)?.expected !== true) {
    return false;
  }
  if (toastError?.error) {
    getToast()?.error(toastError.error);
  }
  return true;
};

export const errorManager = (
  errorMessage: string,
  error: any,
  extra?: any,
  toastError?: {
    error?: string;
  }
) => {
  // Typed ApiErrors (issue #1775) are handled FIRST — above the legacy wallet-
  // error string heuristics below — because an ApiError's message embeds the
  // endpoint path, so a route containing "reject"/"switch chain" (e.g. "HTTP
  // 500 POST /communities/x/reject") would otherwise match the wallet guards
  // and be silently swallowed. Transient failures (network/timeout/abort/429,
  // or a retryable upstream 502/503/504) suppress to a breadcrumb — matching
  // the historical isTransientNetworkError/isTransientHttpError posture below;
  // genuine failures (ContractViolation, non-retryable 4xx/5xx) get
  // reportApiFailure's per-endpoint fingerprinting (§C: "above the existing
  // checks"; isTransientApiError intentionally broadens the snippet's
  // error.expected to also suppress retryable 5xx).
  if (isApiError(error)) {
    handleApiError(error, errorMessage, extra, toastError);
    return;
  }

  if (error?.originalError || error?.message) {
    if (errorContains(error, "reject")) {
      return;
    }
    if (handleSwitchChainError(error, extra)) {
      return;
    }
  }
  if (handleExpectedError(error, toastError)) {
    return;
  }
  if (toastError?.error) {
    const wasRPCIssue = errorContains(error, "rpc error");
    const toastInstance = getToast();
    if (toastInstance) {
      if (wasRPCIssue) {
        toastInstance.error(
          `Oops—${toastError.error.toLowerCase()} It looks like your wallet didn't respond as expected. Try again shortly. If you continue to have trouble, please message us on Telegram: t.me/karmahq`
        );
      } else {
        toastInstance.error(
          `${toastError.error} Try again shortly. If you continue to have trouble, please message us on Telegram: t.me/karmahq`
        );
      }
    }
  }
  // Transient browser-side network errors (offline, CORS preflight, ad-
  // blocker, navigation abort) produce stacks that are pure minified Axios
  // bundle frames with no actionable signal. They get retried by React
  // Query and surface to the user as an error UI, so drop them on the
  // floor for Sentry. See DEV-236 / GAP-FRONTEND-13P.
  if (isTransientNetworkError(error)) {
    return;
  }

  // Transient upstream gateway failures (indexer 504/502/503/408). These
  // crash SSR fetch paths with a minified, frontend-unactionable stack and
  // are tracked on the infra/indexer side, not here. See DEV-271 /
  // GAP-FRONTEND-1R1.
  if (isTransientHttpError(error)) {
    return;
  }

  const errorToCapture = error?.originalError || error?.message;
  Sentry.captureException(error, {
    extra: {
      errorMessage,
      errorInstance: errorToCapture,
      ...extra,
    },
  });
};
