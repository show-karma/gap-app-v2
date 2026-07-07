import { beforeEach, describe, expect, it, vi } from "vitest";

// Wire-contract test for the scanner service. It pins the exact endpoint,
// method, and auth mode each call sends to the indexer — the FE/BE seam the
// v2 refactor moved (/api/scanner/v1 + cookie proxy → /v2/nonprofits/
// ai-readiness + normal Bearer/x-api-key auth). fetchData's 6th positional
// arg is `isAuthorized`; a wrong value here is the class of bug no component
// test catches.
vi.mock("@/utilities/fetchData", () => ({ default: vi.fn() }));

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
import fetchData from "@/utilities/fetchData";

const mockFetch = vi.mocked(fetchData);
const BASE = "/v2/nonprofits/ai-readiness";

// fetchData resolves [data, error, pageInfo, status].
function ok<T>(data: T, status = 200) {
  return [data, null, null, status] as unknown as ReturnType<typeof fetchData> extends Promise<
    infer R
  >
    ? R
    : never;
}
function fail(error: string, status: number) {
  return [null, error, null, status] as unknown as Awaited<ReturnType<typeof fetchData>>;
}

// Positional args of fetchData: (endpoint, method, data, params, headers, isAuthorized, ...)
function callOf(index = 0) {
  const [endpoint, method, data, params, , isAuthorized] = mockFetch.mock.calls[index];
  return { endpoint, method, data, params, isAuthorized };
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
    mockFetch.mockResolvedValueOnce(
      ok({ scanId: "s", slug: "acme", publicUrl: "/s/acme", status: "queued" })
    );
    await submitScan({ url: "https://acme.org" });
    expect(callOf()).toMatchObject({
      endpoint: `${BASE}/scans`,
      method: "POST",
      isAuthorized: true,
    });
  });

  it("getScanByUrl → free GET /scans?url= and returns null on 404", async () => {
    mockFetch.mockResolvedValueOnce(fail("Not found", 404));
    const result = await getScanByUrl("https://acme.org");
    expect(result).toBeNull();
    expect(callOf()).toMatchObject({
      endpoint: `${BASE}/scans`,
      method: "GET",
      params: { url: "https://acme.org" },
      isAuthorized: true,
    });
  });

  it("getScanById → GET /scans/:id with auth so owners get the detail tier", async () => {
    mockFetch.mockResolvedValueOnce(ok(scanPayload));
    await getScanById("scan-1");
    expect(callOf()).toMatchObject({
      endpoint: `${BASE}/scans/scan-1`,
      method: "GET",
      isAuthorized: true,
    });
  });

  it("getPublicScorecardBySlug → anonymous GET /reports/:slug", async () => {
    mockFetch.mockResolvedValueOnce(ok({ slug: "acme" }));
    await getPublicScorecardBySlug("acme");
    expect(callOf()).toMatchObject({
      endpoint: `${BASE}/reports/acme`,
      method: "GET",
      isAuthorized: false,
    });
  });

  it("refreshScan → authenticated POST /scans/:id/refresh", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ scanId: "s", slug: "acme", publicUrl: "/s/acme", status: "queued" })
    );
    await refreshScan("scan-1");
    expect(callOf()).toMatchObject({
      endpoint: `${BASE}/scans/scan-1/refresh`,
      method: "POST",
      isAuthorized: true,
    });
  });

  it("submitContactRequest → POST /contact", async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: "c1" }));
    const payload: ContactRequest = {
      sourceTag: "fix-help",
      contactEmail: "a@b.org",
      message: "help",
    };
    await submitContactRequest(payload);
    expect(callOf()).toMatchObject({
      endpoint: `${BASE}/contact`,
      method: "POST",
      isAuthorized: false,
    });
  });

  describe("findOrCreateScan (view-first)", () => {
    it("views an existing report for free — never POSTs a new scan", async () => {
      mockFetch.mockResolvedValueOnce(ok(scanPayload)); // GET /scans?url=
      const result = await findOrCreateScan({ url: "https://acme.org" });

      expect(result).toEqual({ slug: "acme", status: "complete", created: false });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(callOf(0).method).toBe("GET");
    });

    it("generates a new scan only when none exists (GET 404 → POST)", async () => {
      mockFetch
        .mockResolvedValueOnce(fail("Not found", 404)) // GET /scans?url=
        .mockResolvedValueOnce(
          ok({ scanId: "s", slug: "acme", publicUrl: "/s/acme", status: "queued" })
        ); // POST /scans
      const result = await findOrCreateScan({ url: "https://acme.org" });

      expect(result).toEqual({ slug: "acme", status: "queued", created: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(callOf(0).method).toBe("GET");
      expect(callOf(1)).toMatchObject({ endpoint: `${BASE}/scans`, method: "POST" });
    });
  });
});
