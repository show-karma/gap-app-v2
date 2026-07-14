import fetchData from "@/utilities/fetchData";
import type {
  ContactRequest,
  DetailScorecardPayload,
  PublicScorecardPayload,
  ScanEntryResult,
  SubmitScanRequest,
  SubmitScanResponse,
} from "../types";

// All scanner endpoints live under /v2/nonprofits/ai-readiness. The scanner
// no longer has its own API-key system or same-origin cookie proxy: it
// authenticates exactly like the rest of the app — a Privy JWT (Bearer) or a
// Karma `x-api-key`, both attached by `fetchData` when `isAuthorized` is true
// and the base URL is the indexer. Calls therefore go straight to the indexer
// (browser and server alike), same as every other Karma endpoint.
//
//   - Writes (POST /scans, POST /scans/:id/refresh) authenticate the caller.
//     Anonymous callers are allowed too (identity is optional) but spend the
//     per-IP anonymous allowance.
//   - Reads (GET /scans/:id, GET /scans?url=, GET /reports/:slug) are
//     anonymous-OK. We still send the token when present so an authenticated
//     viewer receives the detail tier of a scan they own.
//
// See gap-indexer/app/modules/v2/nonprofits/ai-readiness for the spec.
const SCANNER_BASE = "/v2/nonprofits/ai-readiness";

// Submit a new scan for a URL. Costs one credit (3 lifetime logged-in,
// 1 anonymous per IP). Prefer `findOrCreateScan` from the submit flow so an
// existing report is viewed for free instead of regenerated.
export async function submitScan(payload: SubmitScanRequest): Promise<SubmitScanResponse> {
  const [data, error, , status] = await fetchData<SubmitScanResponse>(
    `${SCANNER_BASE}/scans`,
    "POST",
    payload,
    {},
    {},
    true
  );
  if (error || data === null) {
    throw Object.assign(new Error(error ?? "Request failed"), { status });
  }
  return data;
}

// Look up the latest report for a URL (free). Returns null when no report
// exists yet (404) so the submit flow can decide whether to generate one.
export async function getScanByUrl(url: string): Promise<DetailScorecardPayload | null> {
  const [data, error, , status] = await fetchData<DetailScorecardPayload>(
    `${SCANNER_BASE}/scans`,
    "GET",
    {},
    { url },
    {},
    true
  );
  if (status === 404) return null;
  if (error || data === null) {
    throw Object.assign(new Error(error ?? "Request failed"), { status });
  }
  return data;
}

// View-first entry point: check for an existing report (free) before spending
// a credit. Only generates a new scan when the site has never been scanned.
// This is the ora.ai model — viewing is free, generating costs a credit, and
// an anonymous POST to an already-scanned URL would waste the per-IP allowance.
export async function findOrCreateScan(payload: SubmitScanRequest): Promise<ScanEntryResult> {
  const existing = await getScanByUrl(payload.url);
  if (existing?.slug) {
    return { slug: existing.slug, status: existing.status, created: false };
  }
  const created = await submitScan(payload);
  return { slug: created.slug, status: created.status, created: true };
}

export async function getScanById(scanId: string): Promise<DetailScorecardPayload> {
  const [data, error, , status] = await fetchData<DetailScorecardPayload>(
    `${SCANNER_BASE}/scans/${scanId}`,
    "GET",
    {},
    {},
    {},
    true
  );
  if (error || data === null) {
    throw Object.assign(new Error(error ?? "Request failed"), { status });
  }
  return data;
}

export async function getPublicScorecardBySlug(slug: string): Promise<PublicScorecardPayload> {
  const [data, error, , status] = await fetchData<PublicScorecardPayload>(
    `${SCANNER_BASE}/reports/${slug}`,
    "GET",
    {},
    {},
    {},
    false
  );
  if (error || data === null) {
    throw Object.assign(new Error(error ?? "Request failed"), { status });
  }
  return data;
}

// Regenerate a site's report. Any logged-in user may regen any site; it spends
// one of their lifetime credits and becomes the new latest report. 401 means
// the caller is not logged in; 429 means their credit cap is reached.
export async function refreshScan(scanId: string): Promise<SubmitScanResponse> {
  const [data, error, , status] = await fetchData<SubmitScanResponse>(
    `${SCANNER_BASE}/scans/${scanId}/refresh`,
    "POST",
    {},
    {},
    {},
    true
  );
  if (error || data === null) {
    throw Object.assign(new Error(error ?? "Request failed"), { status });
  }
  return data;
}

export async function submitContactRequest(payload: ContactRequest): Promise<{ id: string }> {
  const [data, error, , status] = await fetchData<{ id: string }>(
    `${SCANNER_BASE}/contact`,
    "POST",
    payload,
    {},
    {},
    false
  );
  if (error || data === null) {
    throw Object.assign(new Error(error ?? "Request failed"), { status });
  }
  return data;
}
