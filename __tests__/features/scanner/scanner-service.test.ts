import { beforeEach, describe, expect, it, vi } from "vitest";

// Wire-contract test for the scanner service. It pins the exact endpoint,
// method, and auth mode each call sends to the indexer — the FE/BE seam the
// v2 refactor moved (/api/scanner/v1 + cookie proxy → /v2/nonprofits/
// ai-readiness + normal Bearer/x-api-key auth). `isAuthorized` is passed via
// the `api` client's request options; a wrong value here is the class of bug
// no component test catches.
const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import {
  findOrCreateScan,
  getPublicScorecardBySlug,
  getScanById,
  getScanByUrl,
  refreshScan,
  submitContactRequest,
  submitScan,
} from "@/src/features/scanner/services/scanner.service";
import type { ContactRequest, DetailScorecardPayload } from "@/src/features/scanner/types";
import { HttpError } from "@/utilities/api/errors";

const BASE = "/v2/nonprofits/ai-readiness";

function httpError(status: number, endpoint: string, method: string): HttpError {
  return new HttpError(status, { endpoint, method });
}

// Positional args recorded per call type:
// api.get(endpoint, opts) / api.post(endpoint, body, opts)
function getCallOf(index = 0) {
  const [endpoint, opts] = mockGet.mock.calls[index];
  return { endpoint, method: "GET", params: opts?.params, isAuthorized: opts?.isAuthorized };
}
function postCallOf(index = 0) {
  const [endpoint, data, opts] = mockPost.mock.calls[index];
  return { endpoint, method: "POST", data, isAuthorized: opts?.isAuthorized };
}

const scanPayload: DetailScorecardPayload = {
  scanId: "scan-1",
  slug: "acme",
  targetUrl: "https://acme.org/",
  status: "complete",
  viewerIsOwner: false,
};

describe("scanner.service wire contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submitScan → authenticated POST to /scans", async () => {
    mockPost.mockResolvedValueOnce({
      scanId: "s",
      slug: "acme",
      publicUrl: "/s/acme",
      status: "queued",
    });
    await submitScan({ url: "https://acme.org" });
    expect(postCallOf()).toMatchObject({
      endpoint: `${BASE}/scans`,
      method: "POST",
      isAuthorized: true,
    });
  });

  it("getScanByUrl → free GET /scans?url= and returns null on 404", async () => {
    mockGet.mockRejectedValueOnce(httpError(404, `${BASE}/scans`, "GET"));
    const result = await getScanByUrl("https://acme.org");
    expect(result).toBeNull();
    expect(getCallOf()).toMatchObject({
      endpoint: `${BASE}/scans`,
      method: "GET",
      params: { url: "https://acme.org" },
      isAuthorized: true,
    });
  });

  it("getScanById → GET /scans/:id with auth so owners get the detail tier", async () => {
    mockGet.mockResolvedValueOnce(scanPayload);
    await getScanById("scan-1");
    expect(getCallOf()).toMatchObject({
      endpoint: `${BASE}/scans/scan-1`,
      method: "GET",
      isAuthorized: true,
    });
  });

  it("getPublicScorecardBySlug → anonymous GET /reports/:slug", async () => {
    mockGet.mockResolvedValueOnce({ slug: "acme" });
    await getPublicScorecardBySlug("acme");
    expect(getCallOf()).toMatchObject({
      endpoint: `${BASE}/reports/acme`,
      method: "GET",
      isAuthorized: false,
    });
  });

  it("refreshScan → authenticated POST /scans/:id/refresh", async () => {
    mockPost.mockResolvedValueOnce({
      scanId: "s",
      slug: "acme",
      publicUrl: "/s/acme",
      status: "queued",
    });
    await refreshScan("scan-1");
    expect(postCallOf()).toMatchObject({
      endpoint: `${BASE}/scans/scan-1/refresh`,
      method: "POST",
      isAuthorized: true,
    });
  });

  it("submitContactRequest → POST /contact", async () => {
    mockPost.mockResolvedValueOnce({ id: "c1" });
    const payload: ContactRequest = {
      sourceTag: "fix-help",
      contactEmail: "a@b.org",
      message: "help",
    };
    await submitContactRequest(payload);
    expect(postCallOf()).toMatchObject({
      endpoint: `${BASE}/contact`,
      method: "POST",
      isAuthorized: false,
    });
  });

  describe("findOrCreateScan (view-first)", () => {
    it("views an existing report for free — never POSTs a new scan", async () => {
      mockGet.mockResolvedValueOnce(scanPayload); // GET /scans?url=
      const result = await findOrCreateScan({ url: "https://acme.org" });

      expect(result).toEqual({ slug: "acme", status: "complete", created: false });
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("generates a new scan only when none exists (GET 404 → POST)", async () => {
      mockGet.mockRejectedValueOnce(httpError(404, `${BASE}/scans`, "GET")); // GET /scans?url=
      mockPost.mockResolvedValueOnce({
        scanId: "s",
        slug: "acme",
        publicUrl: "/s/acme",
        status: "queued",
      }); // POST /scans
      const result = await findOrCreateScan({ url: "https://acme.org" });

      expect(result).toEqual({ slug: "acme", status: "queued", created: true });
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(postCallOf(0)).toMatchObject({ endpoint: `${BASE}/scans`, method: "POST" });
    });
  });
});
