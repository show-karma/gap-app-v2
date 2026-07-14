import * as Sentry from "@sentry/nextjs";
import { errorManager } from "@/components/Utilities/errorManager";

// Unmock errorManager from global setup to test the actual implementation
vi.unmock("@/components/Utilities/errorManager");
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
}));

describe("errorManager", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("should not capture exception when error is 'rejected'", () => {
    const error = { message: "User rejected the transaction" };

    errorManager("Test error", error);

    // errorManager returns early without logging or capturing for rejected transactions
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
        errorInstance: "Some error occurred",
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
        errorInstance: { code: "ERROR_CODE", message: "Original error message" },
      },
    });
  });

  it("should NOT capture transient axios Network Error (DEV-236)", () => {
    const networkErr = Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });

    errorManager("Project Grants API Error: Network Error", networkErr, {
      context: "project-grants.service",
    });

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("should NOT capture transient SSR socket resets (GAP-FRONTEND-1Y9)", () => {
    const econnreset = Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" });
    errorManager("Indexer fetch failed", econnreset, { context: "ssr" });
    expect(Sentry.captureException).not.toHaveBeenCalled();

    const socketHangUp = Object.assign(new Error("socket hang up"), { code: "ECONNRESET" });
    errorManager("Indexer fetch failed", socketHangUp);
    expect(Sentry.captureException).not.toHaveBeenCalled();

    const tlsReset = new Error(
      "Client network socket disconnected before secure TLS connection was established"
    );
    errorManager("Indexer fetch failed", tlsReset);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("should still capture HTTP errors (e.g. 500) that carry a response", () => {
    const httpErr = {
      message: "Request failed with status code 500",
      response: { status: 500 },
    };

    errorManager("Project Grants API Error", httpErr);

    expect(Sentry.captureException).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------
  // Expected-state filter (GAP-FRONTEND-24N) — errors marked `expected: true`
  // (e.g. SignerUnavailableError) are guidance, not defects.
  // ---------------------------------------------------------------------
  describe("expected errors (GAP-FRONTEND-24N)", () => {
    it("does NOT capture an error with expected: true", () => {
      const error = Object.assign(new Error("No wallet is connected."), { expected: true });

      errorManager("Failed to create project", error);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("does not capture or throw for an expected error even when toastError.error is provided", () => {
      const error = Object.assign(new Error("No wallet is connected."), { expected: true });

      expect(() =>
        errorManager("Failed to create project", error, undefined, {
          error: "No wallet is connected.",
        })
      ).not.toThrow();

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("does not throw when expected: true and no toastError is provided", () => {
      const error = Object.assign(new Error("No wallet is connected."), { expected: true });

      expect(() => errorManager("Failed to create project", error)).not.toThrow();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });
});
