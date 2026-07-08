import { captureException, captureMessage } from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ContractViolationError,
  HttpError,
  NetworkError,
  RequestAborted,
  TimeoutError,
} from "../errors";
import { reportApiFailure } from "../report";

const mockCaptureMessage = captureMessage as ReturnType<typeof vi.fn>;
const mockCaptureException = captureException as ReturnType<typeof vi.fn>;

describe("reportApiFailure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports a NetworkError as a warning message, fingerprinted by kind + code", () => {
    const error = new NetworkError({
      endpoint: "/v2/projects",
      method: "get",
      code: "ECONNRESET",
    });

    reportApiFailure(error, 3);

    expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
    expect(mockCaptureMessage).toHaveBeenCalledWith(expect.any(String), {
      level: "warning",
      fingerprint: ["api-retries-exhausted", "network", "ECONNRESET"],
      extra: { endpoint: "/v2/projects", method: "GET", attempts: 3 },
    });
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("falls back to 'unknown' in the fingerprint when NetworkError has no code", () => {
    const error = new NetworkError({ endpoint: "/v2/projects", method: "get" });

    reportApiFailure(error, 1);

    expect(mockCaptureMessage).toHaveBeenCalledWith(expect.any(String), {
      level: "warning",
      fingerprint: ["api-retries-exhausted", "network", "unknown"],
      extra: { endpoint: "/v2/projects", method: "GET", attempts: 1 },
    });
  });

  it("reports a 429 HttpError (expected) as a warning message, fingerprinted by status", () => {
    const error = new HttpError(429, { endpoint: "/v2/payouts", method: "post" });

    reportApiFailure(error, 2);

    expect(mockCaptureMessage).toHaveBeenCalledWith(expect.any(String), {
      level: "warning",
      fingerprint: ["api-retries-exhausted", "http", "429"],
      extra: { endpoint: "/v2/payouts", method: "POST", attempts: 2 },
    });
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("reports a retryable upstream 504 HttpError (expected===false, retryable===true) as a warning message", () => {
    const error = new HttpError(504, { endpoint: "/v2/projects", method: "get" });

    reportApiFailure(error, 3);

    expect(mockCaptureMessage).toHaveBeenCalledWith(expect.any(String), {
      level: "warning",
      fingerprint: ["api-retries-exhausted", "http", "504"],
      extra: { endpoint: "/v2/projects", method: "GET", attempts: 3 },
    });
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("reports a TimeoutError as a warning message", () => {
    const error = new TimeoutError({ endpoint: "/v2/projects", method: "get", timeoutMs: 30000 });

    reportApiFailure(error, 1);

    expect(mockCaptureMessage).toHaveBeenCalledWith(expect.any(String), {
      level: "warning",
      fingerprint: ["api-retries-exhausted", "timeout", "unknown"],
      extra: { endpoint: "/v2/projects", method: "GET", attempts: 1 },
    });
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("reports a RequestAborted as a warning message", () => {
    const error = new RequestAborted({ endpoint: "/v2/projects", method: "delete" });

    reportApiFailure(error, 1);

    expect(mockCaptureMessage).toHaveBeenCalledWith(expect.any(String), {
      level: "warning",
      fingerprint: ["api-retries-exhausted", "aborted", "unknown"],
      extra: { endpoint: "/v2/projects", method: "DELETE", attempts: 1 },
    });
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("reports a ContractViolationError via captureException, fingerprinted by endpoint, endpoint never in message-level fingerprint of the warning path", () => {
    const error = new ContractViolationError({
      endpoint: "/v2/projects",
      method: "get",
      issues: ["title: Required", "uid: Expected string, received number"],
    });

    reportApiFailure(error);

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      level: "error",
      fingerprint: ["api-contract-violation", "/v2/projects"],
      extra: {
        endpoint: "/v2/projects",
        method: "GET",
        issues: ["title: Required", "uid: Expected string, received number"],
      },
    });
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it("reports an unexpected HttpError (e.g. 500) via a normal captureException", () => {
    const error = new HttpError(500, { endpoint: "/v2/projects", method: "post" });

    reportApiFailure(error, 1);

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      extra: { endpoint: "/v2/projects", method: "POST", status: 500, attempts: 1 },
    });
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it("puts the endpoint in extra, never in the fingerprint, for the exhaustion (warning) path", () => {
    const error = new HttpError(429, { endpoint: "/v2/very/specific/path/123", method: "get" });

    reportApiFailure(error, 3);

    const [, context] = mockCaptureMessage.mock.calls[0];
    expect(context.fingerprint).not.toContain("/v2/very/specific/path/123");
    expect(context.extra.endpoint).toBe("/v2/very/specific/path/123");
  });

  it("does nothing for a non-ApiError value", () => {
    // @ts-expect-error — intentionally passing a non-ApiError to verify the runtime guard
    reportApiFailure(new Error("boom"));

    expect(mockCaptureMessage).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });
});
