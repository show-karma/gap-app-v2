import { errorManager } from "./errorManager";
import * as Sentry from "@sentry/nextjs";

jest.mock("@sentry/nextjs");

describe("errorManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not capture exception when error is 'rejected'", () => {
    const consoleLogSpy = jest.spyOn(console, "log");
    const error = { message: "User rejected the transaction" };

    errorManager("Test error", error);

    expect(consoleLogSpy).toHaveBeenCalledWith("User rejected action");
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("should capture exception for non-rejected errors", () => {
    const errorMessage = "Test error";
    const error = new Error("Some error occurred");
    const extra = { additionalInfo: "Some extra info" };

    errorManager(errorMessage, error, extra);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      extra: {
        errorMessage,
        additionalInfo: "Some extra info",
      },
    });
  });

  it("should handle errors with originalError property", () => {
    const errorMessage = "Test error";
    const error = {
      originalError: { code: "ERROR_CODE", message: "Original error message" },
    };

    errorManager(errorMessage, error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      extra: {
        errorMessage,
      },
    });
  });
});
