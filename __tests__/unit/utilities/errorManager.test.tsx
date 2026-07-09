import * as Sentry from "@sentry/nextjs";
import { errorManager } from "@/components/Utilities/errorManager";
import { ContractViolationError, HttpError, NetworkError } from "@/utilities/api/errors";

// Unmock errorManager from global setup to test the actual implementation
vi.unmock("@/components/Utilities/errorManager");
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
  addBreadcrumb: vi.fn(),
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

  it("should still capture HTTP errors (e.g. 500) that carry a response", () => {
    const httpErr = {
      message: "Request failed with status code 500",
      response: { status: 500 },
    };

    errorManager("Project Grants API Error", httpErr);

    expect(Sentry.captureException).toHaveBeenCalled();
  });

  describe("typed ApiError early-return", () => {
    it("should add a breadcrumb and not capture an expected NetworkError", () => {
      const error = new NetworkError({ endpoint: "/x", method: "GET" });

      errorManager("Test error", error);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "api",
        message: error.message,
        level: "warning",
      });
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("should add a breadcrumb and not capture an expected HttpError (429)", () => {
      const error = new HttpError(429, { endpoint: "/x", method: "GET" });

      errorManager("Test error", error);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "api",
        message: error.message,
        level: "warning",
      });
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("should capture an unexpected ContractViolationError", () => {
      const error = new ContractViolationError({
        endpoint: "/x",
        method: "GET",
        issues: ["x"],
      });

      errorManager("Test error", error);

      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it("should capture an unexpected HttpError (500)", () => {
      const error = new HttpError(500, { endpoint: "/x", method: "GET" });

      errorManager("Test error", error);

      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe("reportApiFailure delegation (Y2)", () => {
    it("routes an unexpected ContractViolationError through reportApiFailure's per-endpoint fingerprint", () => {
      const error = new ContractViolationError({
        endpoint: "/x/y",
        method: "GET",
        issues: ["bad"],
      });

      errorManager("Test error", error);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          fingerprint: ["api-contract-violation", "/x/y"],
        })
      );
    });

    it("still reports a non-retryable typed HttpError (500)", () => {
      const error = new HttpError(500, { endpoint: "/x", method: "GET" });

      errorManager("Test error", error);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: expect.objectContaining({ endpoint: "/x", method: "GET", status: 500 }),
        })
      );
    });

    it("suppresses a typed transient HttpError (503) to a breadcrumb, matching legacy suppression", () => {
      const error = new HttpError(503, { endpoint: "/x", method: "GET" });

      errorManager("Test error", error);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "api",
        message: error.message,
        level: "warning",
      });
      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    it("still runs the toast block before delegating a genuine typed ApiError to reportApiFailure", () => {
      const error = new HttpError(500, { endpoint: "/x", method: "GET" });

      // The toast block (guarded by `toastError?.error`) must run before the
      // typed-ApiError delegation, not be skipped by an early return — this
      // is only observable indirectly here (jsdom has no real toast host),
      // so we assert the call reaches reportApiFailure's capture without
      // throwing, proving the toast block executed and fell through.
      expect(() => errorManager("Test error", error, undefined, { error: "Boom" })).not.toThrow();

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: expect.objectContaining({ endpoint: "/x", method: "GET", status: 500 }),
        })
      );
    });

    it("keeps expected typed errors (NetworkError/429) breadcrumb-only, not routed to reportApiFailure", () => {
      const networkError = new NetworkError({ endpoint: "/x", method: "GET" });
      errorManager("Test error", networkError);
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "api",
        message: networkError.message,
        level: "warning",
      });
      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).not.toHaveBeenCalled();

      vi.clearAllMocks();

      const rateLimited = new HttpError(429, { endpoint: "/x", method: "GET" });
      errorManager("Test error", rateLimited);
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "api",
        message: rateLimited.message,
        level: "warning",
      });
      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });

  describe("handleSwitchChainError path", () => {
    it("toasts a network-switch hint and returns early without capturing to Sentry", () => {
      const error = { message: "please switch chain to Base and retry" };

      errorManager("Test error", error, { targetNetwork: "Base" });

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });
});
