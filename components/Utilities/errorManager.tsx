import * as Sentry from "@sentry/nextjs";
import toast from "react-hot-toast";

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
      error?.originalError?.code?.toLowerCase()?.includes("rejected") ||
      error?.originalError?.message?.toLowerCase()?.includes("rejected") ||
      error?.message?.toLowerCase()?.includes("rejected");
    if (wasRejected) {
      console.log("User rejected action");
      return;
    }
  }
  if (toastError?.error) {
    const wasRPCIssue =
      error?.originalError?.code?.toLowerCase()?.includes("rpc error") ||
      error?.originalError?.message?.toLowerCase()?.includes("rpc error") ||
      error?.message?.toLowerCase()?.includes("rpc error");
    if (wasRPCIssue) {
      toast.error(
        `Oops—${toastError.error.toLowerCase()} It looks like your wallet didn’t respond as expected. Try again shortly. If you continue to have trouble, please message us on Telegram: t.me/karmahq`
      );
    } else {
      toast.error(
        `${toastError.error} Try again shortly. If you continue to have trouble, please message us on Telegram: t.me/karmahq`
      );
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
