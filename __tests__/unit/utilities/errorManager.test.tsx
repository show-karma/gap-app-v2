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

    it("reports a typed ApiError whose endpoint path contains a wallet-guard word ('reject') instead of swallowing it", () => {
      // Regression: an ApiError's message embeds the endpoint, so a route like
      // /communities/x/reject matches the legacy `errorContains(error,"reject")`
      // wallet guard. Handling typed ApiErrors FIRST (above those guards) keeps
      // genuine failures on such endpoints from vanishing from Sentry.
      const contract = new ContractViolationError({
        endpoint: "/communities/x/reject",
        method: "POST",
        issues: ["bad"],
      });

      errorManager("Test error", contract);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        contract,
        expect.objectContaining({
          fingerprint: ["api-contract-violation", "/communities/x/reject"],
        })
      );

      vi.clearAllMocks();

      const serverError = new HttpError(500, { endpoint: "/proposals/123/reject", method: "GET" });
      errorManager("Test error", serverError);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        serverError,
        expect.objectContaining({
          extra: expect.objectContaining({ endpoint: "/proposals/123/reject", status: 500 }),
        })
      );
    });

    it("routes a genuine typed ApiError to reportApiFailure without throwing, even when a toastError is supplied", () => {
      // Typed ApiErrors are handled above the legacy wallet-error guards, but
      // that must not drop user-facing feedback: a toastError is now fired
      // the same as the legacy string-error path, in addition to reporting
      // (see the `fireErrorToast` call at the top of the isApiError branch).
      // Note: errorManager's toast module is loaded via a lazy `require()`
      // (to stay SSR-safe), which bypasses `vi.mock("react-hot-toast", ...)`
      // in this test runner, so the toast call itself isn't assertable here
      // — only that reporting still happens and nothing throws.
      const error = new HttpError(500, { endpoint: "/grants/x", method: "GET" });

      expect(() =>
        errorManager("Could not save", error, undefined, { error: "Could not save" })
      ).not.toThrow();

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: expect.objectContaining({ endpoint: "/grants/x", status: 500 }),
        })
      );
    });

    it("does not throw for a transient typed ApiError (429) even when a toastError is supplied", () => {
      const error = new HttpError(429, { endpoint: "/x", method: "GET" });

      expect(() =>
        errorManager("Test error", error, undefined, { error: "Test error" })
      ).not.toThrow();

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "api",
        message: error.message,
        level: "warning",
      });
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
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------
  // Suppression breadcrumbs (super-gap #64) — a suppressed error used to be
  // invisible in BOTH directions: generic toast, nothing in Sentry. Every
  // early-return path must now leave a trace.
  // ---------------------------------------------------------------------
  describe("suppressed-error breadcrumbs (#64)", () => {
    const expectSuppressedBreadcrumb = (reason: string) =>
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "suppressed-error",
          level: "warning",
          data: expect.objectContaining({ reason }),
        })
      );

    it("breadcrumbs a suppressed transient network error", () => {
      const networkErr = Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });

      errorManager("Error verifying milestone", networkErr, { step: "poll" });

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expectSuppressedBreadcrumb("transient-network");
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Error verifying milestone",
          data: expect.objectContaining({ step: "poll" }),
        })
      );
    });

    it("breadcrumbs a suppressed transient gateway error", () => {
      const gatewayErr = Object.assign(new Error("Request failed with status code 504"), {
        response: { status: 504 },
      });

      errorManager("Error verifying milestone", gatewayErr);

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expectSuppressedBreadcrumb("transient-http");
    });

    it("breadcrumbs a suppressed user rejection", () => {
      errorManager("Error verifying milestone", { message: "User rejected the transaction" });

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expectSuppressedBreadcrumb("user-rejected");
    });

    it("breadcrumbs a suppressed switch-chain error", () => {
      errorManager(
        "Error verifying milestone",
        { message: "could not switch chain" },
        {
          targetNetwork: "Base",
        }
      );

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expectSuppressedBreadcrumb("switch-chain");
    });

    it("breadcrumbs a suppressed expected wallet-lifecycle error", () => {
      const error = Object.assign(new Error("No wallet is connected."), { expected: true });

      errorManager("Error verifying milestone", error);

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expectSuppressedBreadcrumb("expected-state");
    });
  });

  // ---------------------------------------------------------------------
  // Expected-state filter (GAP-FRONTEND-24N) — errors marked `expected: true`
  // (e.g. SignerUnavailableError) are guidance, not defects.
  // ---------------------------------------------------------------------
  // GAP-FRONTEND-23J: attestation failures reach Sentry wearing karma-gap-sdk's
  // constant "Error during attestation." message, so every on-chain write in the
  // app groups together — one issue held a wallet stack overflow AND an ERC-4337
  // rejection at the same time. Callers opt in with an `attestation` context and
  // get classification + fingerprinting instead.
  describe("attestation failures (GAP-FRONTEND-23J)", () => {
    const sdkWrapper = (originalError: unknown) =>
      Object.assign(new Error("ATTEST_ERROR: Error during attestation."), {
        code: 50012,
        originalError,
      });

    const attestation = { entity: "ProjectUpdate", chainId: 42161, signingMode: "external" };

    it("fingerprints and tags an opted-in attestation failure", () => {
      errorManager("Error creating project activity", sdkWrapper(new Error("boom")), {
        attestation,
        projectUID: "0xabc",
      });

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      const [, options] = vi.mocked(Sentry.captureException).mock.calls[0];
      expect(options?.fingerprint).toEqual(["attestation", "ProjectUpdate", "unclassified"]);
      expect(options?.tags).toMatchObject({ "attest.entity": "ProjectUpdate" });
      expect(options?.extra).toMatchObject({ projectUID: "0xabc" });
    });

    it("does not leak the internal `attestation` context into extra", () => {
      errorManager("Error creating project activity", sdkWrapper(new Error("boom")), {
        attestation,
      });

      const [, options] = vi.mocked(Sentry.captureException).mock.calls[0];
      expect(options?.extra).not.toHaveProperty("attestation");
    });

    // The routing sits BELOW the reject/switch-chain/expected guards on purpose:
    // declining the wallet prompt also arrives wrapped in an AttestationError,
    // and that is guidance, not a defect.
    it("still suppresses a user rejection wrapped in an attestation error", () => {
      errorManager(
        "Error creating project activity",
        sdkWrapper(new Error("User rejected the request")),
        { attestation }
      );

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("leaves callers that opted out on the generic capture path", () => {
      errorManager("Error creating project activity", sdkWrapper(new Error("boom")), {
        projectUID: "0xabc",
      });

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      const [, options] = vi.mocked(Sentry.captureException).mock.calls[0];
      expect(options?.fingerprint).toBeUndefined();
    });
  });

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
