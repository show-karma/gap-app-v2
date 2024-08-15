import * as Sentry from "@sentry/react";

export const errorManager = (errorMessage: string, error: any) => {
  Sentry.captureException(`${errorMessage}: ${error}`);
};
