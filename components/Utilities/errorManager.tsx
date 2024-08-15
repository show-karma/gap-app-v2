import * as Sentry from "@sentry/nextjs";

export const errorManager = (errorMessage: string, error: any) => {
  Sentry.captureException(`${errorMessage}: ${error}`);
};
