import * as Sentry from "@sentry/nextjs";

export const errorManager = (errorMessage: string, error: any, extra?: any) => {
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

  Sentry.captureException(error, {
    extra: {
      errorMessage,
      ...extra,
    },
  });
};
