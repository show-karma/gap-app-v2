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
// Identity is resolved server-side from Privy session cookie or Karma API key,
// and the response shape varies by identity tier (public vs detail).
// See gap-indexer/app/modules/v2/api/scanner/v1/openapi-extension.ts for the spec.
const SCANNER_BASE = "/api/scanner/v1";

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
    `${SCANNER_BASE}/s/${slug}`,
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

export async function listScannerApiKeys(): Promise<ScannerApiKey[]> {
  const [data, error, , status] = await fetchData<ScannerApiKey[]>(
    `${SCANNER_BASE}/me/api-keys`,
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

export async function issueScannerApiKey(
  payload: IssueScannerApiKeyRequest
): Promise<IssuedScannerApiKey> {
  const [data, error, , status] = await fetchData<IssuedScannerApiKey>(
    `${SCANNER_BASE}/me/api-keys`,
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

export async function revokeScannerApiKey(keyId: string): Promise<void> {
  const [, error, , status] = await fetchData<void>(
    `${SCANNER_BASE}/me/api-keys/${keyId}`,
    "DELETE",
    {},
    {},
    {},
    true
  );
  if (error) {
    throw Object.assign(new Error(error), { status });
  }
}
