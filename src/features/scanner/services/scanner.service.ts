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
// Calls route through the same-origin Next.js proxy at
// app/api/scanner/v1/[...path]/route.ts (empty baseUrl below) so the browser
// forwards the Privy session cookie to the BE — a cross-origin call to
// the gap-indexer port would drop the cookie and the BE would respond 401.
// The proxy preserves Authorization headers too, so keyed callers work.
// See gap-indexer/app/modules/v2/api/scanner/v1/openapi-extension.ts for the spec.
const SCANNER_BASE = "/api/scanner/v1";
const PROXY = "";

export async function submitScan(payload: SubmitScanRequest): Promise<SubmitScanResponse> {
  const [data, error, , status] = await fetchData<SubmitScanResponse>(
    `${SCANNER_BASE}/scans`,
    "POST",
    payload,
    {},
    {},
    false,
    false,
    PROXY
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
    PROXY
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
    PROXY
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
    PROXY
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
    PROXY
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
    PROXY
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
    PROXY
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
    PROXY
  );
  if (error) {
    throw Object.assign(new Error(error), { status });
  }
}
