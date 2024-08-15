import * as Sentry from "@sentry/nextjs";

export const errorManager = (errorMessage: string, error: any) => {
  if (error?.originalError?.code || error?.originalError?.message) {
    const wasRejected =
      error?.originalError?.code?.toLowerCase()?.includes("rejected") ||
      error?.originalError?.message?.toLowerCase()?.includes("rejected");
    if (wasRejected) {
      return;
    }
  }

  Sentry.captureException(`${errorMessage}: ${error}`);
};
