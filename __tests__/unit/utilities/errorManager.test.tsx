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
});
