import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiGet = vi.fn();

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

import { fetchDiligenceResponseContext, getDiligenceTemplate } from "@/services/diligence.service";
import {
  DONOR_RESEARCH_DISABLED_CODE,
  donorResearchQueryRetry,
  isDonorResearchDisabledError,
} from "@/services/donor-research.service";
import { listAdvisors } from "@/services/donor-research-admin.service";
import { HttpError } from "@/utilities/api/errors";

function httpError(status: number, body?: unknown): HttpError {
  return new HttpError(status, { endpoint: "/v2/donor-research/me", method: "get", body });
}

const disabledBody = {
  error: DONOR_RESEARCH_DISABLED_CODE,
  message: "Donor research is temporarily disabled.",
};

/**
 * The indexer's kill switch answers every donor-research route with
 * `503 { error: "donor_research_disabled" }`. Only that exact shape is the
 * "paused" signal — a bare 503 is an upstream blip and keeps the normal
 * transient handling (retry, breadcrumb-only Sentry).
 */
describe("isDonorResearchDisabledError", () => {
  it("is true for a 503 carrying the kill-switch code", () => {
    expect(isDonorResearchDisabledError(httpError(503, disabledBody))).toBe(true);
  });

  it.each([
    ["no body", undefined],
    ["a body without error", { message: "Service Unavailable" }],
    ["another error code", { error: "upstream_unavailable" }],
    ["a non-string error", { error: 503 }],
    ["a non-object body", "donor_research_disabled"],
  ])("is false for a 503 with %s", (_label, body) => {
    expect(isDonorResearchDisabledError(httpError(503, body))).toBe(false);
  });

  it.each([400, 401, 404, 429, 500, 502, 504])(
    "is false for HTTP %i even with the kill-switch body",
    (status) => {
      expect(isDonorResearchDisabledError(httpError(status, disabledBody))).toBe(false);
    }
  );

  it.each([
    ["a plain Error", new Error("donor_research_disabled")],
    ["a duck-typed object", { status: 503, body: disabledBody }],
    ["null", null],
    ["undefined", undefined],
    ["a string", "donor_research_disabled"],
  ])("is false for %s", (_label, value) => {
    expect(isDonorResearchDisabledError(value)).toBe(false);
  });
});

describe("donorResearchQueryRetry", () => {
  it("never retries the kill-switch 503", () => {
    expect(donorResearchQueryRetry(0, httpError(503, disabledBody))).toBe(false);
  });

  it("keeps the default policy for a transient 503 without the code", () => {
    expect(donorResearchQueryRetry(0, httpError(503))).toBe(true);
    expect(donorResearchQueryRetry(1, httpError(503))).toBe(true);
    expect(donorResearchQueryRetry(2, httpError(503))).toBe(false);
  });

  it("keeps the default policy for non-retryable statuses", () => {
    expect(donorResearchQueryRetry(0, httpError(500))).toBe(false);
  });
});

/**
 * The diligence/admin read paths used to rewrap every failure in a plain
 * `Error(message)`, which dropped the status and body — so neither the paused
 * UI nor the no-retry policy could recognise the kill switch on them.
 */
describe("read paths keep the kill-switch error typed", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it("getDiligenceTemplate rethrows the same HttpError", async () => {
    const err = httpError(503, disabledBody);
    mockApiGet.mockRejectedValue(err);
    await expect(getDiligenceTemplate()).rejects.toBe(err);
  });

  it("getDiligenceTemplate still maps other failures to the body message", async () => {
    mockApiGet.mockRejectedValue(httpError(500, { message: "Boom" }));
    const rejection = getDiligenceTemplate();
    await expect(rejection).rejects.toThrow("Boom");
    await expect(rejection).rejects.not.toBeInstanceOf(HttpError);
  });

  it("fetchDiligenceResponseContext rethrows the same HttpError", async () => {
    const err = httpError(503, disabledBody);
    mockApiGet.mockRejectedValue(err);
    await expect(fetchDiligenceResponseContext("tok")).rejects.toBe(err);
  });

  it("listAdvisors rethrows the same HttpError", async () => {
    const err = httpError(503, disabledBody);
    mockApiGet.mockRejectedValue(err);
    await expect(listAdvisors()).rejects.toBe(err);
  });
});
