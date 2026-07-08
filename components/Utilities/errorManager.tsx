import * as Sentry from "@sentry/nextjs";
import { isApiError } from "@/utilities/api/errors";
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

export const errorManager = (
  errorMessage: string,
  error: any,
  extra?: any,
  toastError?: {
    error?: string;
  }
) => {
  if (isApiError(error) && error.expected) {
    Sentry.addBreadcrumb({ category: "api", message: error.message, level: "warning" });
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
