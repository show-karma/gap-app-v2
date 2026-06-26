import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";
import type {
  ContactRequest,
  DetailScorecardPayload,
  IssuedScannerApiKey,
  IssueScannerApiKeyRequest,
  PublicScorecardPayload,
  ScannerApiKey,
  SubmitScanRequest,
  SubmitScanResponse,
} from "../types";

// All scanner endpoints live under /api/scanner/v1.
// Identity is resolved server-side from Privy session cookie or Karma API key.
//
// Browser callers route through the same-origin Next.js proxy at
// app/api/scanner/v1/[...path]/route.ts (empty baseUrl) so the browser
// forwards the Privy session cookie to the BE — a cross-origin call to
// the gap-indexer port would drop the cookie and the BE would respond 401.
//
// Server callers (Next.js server components, route handlers, OG image
// generation) bypass the proxy and hit the absolute backend URL because
// axios in Node rejects a relative URL with ERR_INVALID_URL; the empty
// baseUrl silently produced null SSR scorecards before. There is no
// cookie to forward in the SSR context anyway (the scorecard endpoint
// is public).
// See gap-indexer/app/modules/v2/api/scanner/v1/openapi-extension.ts for the spec.
const SCANNER_BASE = "/api/scanner/v1";
const SCANNER_PROXY = typeof window === "undefined"
  ? envVars.NEXT_PUBLIC_GAP_INDEXER_URL.replace(/\/$/, "")
  : "";

export async function submitScan(payload: SubmitScanRequest): Promise<SubmitScanResponse> {
  const [data, error, , status] = await fetchData<SubmitScanResponse>(
    `${SCANNER_BASE}/scans`,
    "POST",
    payload,
    {},
    {},
    false,
    false,
    SCANNER_PROXY
  );
  if (error || data === null) {
    throw Object.assign(new Error(error ?? "Request failed"), { status });
  }
  return data;
}

export async function getScanById(scanId: string): Promise<DetailScorecardPayload> {
  const [data, error, , status] = await fetchData<DetailScorecardPayload>(
    `${SCANNER_BASE}/scans/${scanId}`,
    "GET",
    {},
    {},
    {},
    false,
    false,
    SCANNER_PROXY
  );
  if (error || data === null) {
    throw Object.assign(new Error(error ?? "Request failed"), { status });
  }
  return data;
}

export async function getPublicScorecardBySlug(slug: string): Promise<PublicScorecardPayload> {
  const [data, error, , status] = await fetchData<PublicScorecardPayload>(
    `${SCANNER_BASE}/s/${slug}`,
    "GET",
    {},
    {},
    {},
    false,
    false,
    SCANNER_PROXY
  );
  if (error || data === null) {
    throw Object.assign(new Error(error ?? "Request failed"), { status });
  }
  return data;
}

export async function refreshScan(scanId: string): Promise<SubmitScanResponse> {
  const [data, error, , status] = await fetchData<SubmitScanResponse>(
    `${SCANNER_BASE}/scans/${scanId}/refresh`,
    "POST",
    {},
    {},
    {},
    false,
    false,
    SCANNER_PROXY
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
    false,
    false,
    SCANNER_PROXY
  );
  if (error || data === null) {
    throw Object.assign(new Error(error ?? "Request failed"), { status });
  }
  return data;
}

export async function listScannerApiKeys(): Promise<ScannerApiKey[]> {
  const [data, error, , status] = await fetchData<ScannerApiKey[]>(
    `${SCANNER_BASE}/me/api-keys`,
    "GET",
    {},
    {},
    {},
    false,
    false,
    SCANNER_PROXY
  );
  if (error || data === null) {
    throw Object.assign(new Error(error ?? "Request failed"), { status });
  }
  return data;
}

export async function issueScannerApiKey(
  payload: IssueScannerApiKeyRequest
): Promise<IssuedScannerApiKey> {
  const [data, error, , status] = await fetchData<IssuedScannerApiKey>(
    `${SCANNER_BASE}/me/api-keys`,
    "POST",
    payload,
    {},
    {},
    false,
    false,
    SCANNER_PROXY
  );
  if (error || data === null) {
    throw Object.assign(new Error(error ?? "Request failed"), { status });
  }
  return data;
}

export async function revokeScannerApiKey(keyId: string): Promise<void> {
  const [, error, , status] = await fetchData<void>(
    `${SCANNER_BASE}/me/api-keys/${keyId}`,
    "DELETE",
    {},
    {},
    {},
    false,
    false,
    SCANNER_PROXY
  );
  if (error) {
    throw Object.assign(new Error(error), { status });
  }
}
