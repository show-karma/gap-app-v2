import * as Sentry from "@sentry/nextjs";

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

export const errorManager = (
  errorMessage: string,
  error: any,
  extra?: any,
  toastError?: {
    error?: string;
  }
) => {
  if (error?.originalError || error?.message) {
    const wasRejected =
      error?.originalError?.code?.toLowerCase()?.includes("reject") ||
      error?.originalError?.message?.toLowerCase()?.includes("reject") ||
      error?.message?.toLowerCase()?.includes("reject");
    const couldNotSwitchChain =
      error?.originalError?.code?.toLowerCase()?.includes("switch chain") ||
      error?.originalError?.message?.toLowerCase()?.includes("switch chain") ||
      error?.message?.toLowerCase()?.includes("switch chain");
    if (wasRejected) {
      return;
    }
    const targetNetwork = extra?.targetNetwork;
    if (couldNotSwitchChain) {
      const toastInstance = getToast();
      if (toastInstance) {
        toastInstance.error(
          `we couldn't switch to "${targetNetwork}" network in your wallet. Please manually switch network and try again`
        );
      }
      return;
    }
  }
  if (toastError?.error) {
    const wasRPCIssue =
      error?.originalError?.code?.toLowerCase()?.includes("rpc error") ||
      error?.originalError?.message?.toLowerCase()?.includes("rpc error") ||
      error?.message?.toLowerCase()?.includes("rpc error");
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
  const errorToCapture = error?.originalError || error?.message;
  Sentry.captureException(error, {
    extra: {
      errorMessage,
      errorInstance: errorToCapture,
      ...extra,
    },
  });
};
