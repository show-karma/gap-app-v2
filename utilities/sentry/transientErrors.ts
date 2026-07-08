/**
 * Helpers for detecting transient/unactionable network errors that should
 * not be sent to Sentry and SHOULD be retried by the data layer.
 *
 * Context: Sentry issue GAP-FRONTEND-13P ("AxiosError: Network Error" on the
 * project funding page) ran at 923 events / 49 users. The signature comes
 * from `XMLHttpRequest.onerror` — i.e. the browser never received a usable
 * HTTP response. This is produced by:
 *   - request aborted by browser (route change, BFCache, unload)
 *   - user offline / DNS failure / TLS reset
 *   - ad-blocker or privacy extension blocking the host
 *   - CORS preflight failure
 *   - mixed content (HTTPS page → HTTP endpoint)
 *
 * None of these are actionable from a Sentry event — the stack only
 * contains the minified Axios bundle. The right behavior is: retry on the
 * client, surface an error UI to the user, and keep Sentry signal clean.
 */

const TRANSIENT_MESSAGE_FRAGMENTS = ["network error", "failed to fetch", "load failed"];

const TRANSIENT_AXIOS_CODES = new Set([
  "ERR_NETWORK",
  "ERR_INTERNET_DISCONNECTED",
  "ERR_CONNECTION_RESET",
  "ECONNABORTED",
  "ETIMEDOUT",
]);

const ABORT_CODES = new Set(["ERR_CANCELED", "ABORT_ERR"]);

// Upstream HTTP statuses that mean "the indexer/gateway was momentarily
// unreachable", not "the frontend code is broken". A 504 (gateway timeout)
// from the indexer during SSR surfaces as a minified `Request failed with
// status code 504` server crash with no actionable first-party frame — the
// only fix is on the infra/indexer side, so it's noise in the frontend
// Sentry project. 502/503/408 share the same transient, retriable shape.
// See DEV-271 / GAP-FRONTEND-1R1.
const TRANSIENT_HTTP_STATUS = new Set([408, 502, 503, 504]);

function getErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "";
}

function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

function hasHttpResponse(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "response" in error &&
    !!(error as { response?: unknown }).response
  );
}

// Pulls an HTTP status code off the various error shapes that reach Sentry:
// an axios error (`error.response.status`), the `[null, error, null, status]`
// tuple-style object some callers attach (`error.status`), or nothing.
function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const response = (error as { response?: { status?: unknown } }).response;
  if (response && typeof response.status === "number") return response.status;
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") return status;
  return undefined;
}

/**
 * True when the error represents a cancellation (route change, unmount,
 * AbortController). These should never reach Sentry and should never be
 * retried.
 */
export function isAxiosAbortError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (code && ABORT_CODES.has(code)) return true;
  const name = (error as { name?: unknown } | null)?.name;
  return name === "CanceledError" || name === "AbortError";
}

/**
 * True when the error is a transient network failure that has no HTTP
 * response attached. Used to (a) suppress Sentry noise and (b) opt in to
 * additional React Query retries.
 */
export function isTransientNetworkError(error: unknown): boolean {
  if (!error) return false;
  if (isAxiosAbortError(error)) return true;
  if (hasHttpResponse(error)) return false;

  const code = getErrorCode(error);
  if (code && TRANSIENT_AXIOS_CODES.has(code)) return true;

  const message = getErrorMessage(error).toLowerCase();
  return TRANSIENT_MESSAGE_FRAGMENTS.some((fragment) => message.includes(fragment));
}

// ethers v6 wraps a momentary wallet/bundler timeout into a "could not coalesce
// error" with code UNKNOWN_ERROR whose nested payload is `{ "message": "Wallet
// timeout" }`. During project creation we retry the send (see
// utilities/attestWithRetry.ts), so a RECOVERED timeout never reaches Sentry —
// but the raw signature can still leak through code paths that bypass
// errorManager (an un-awaited rejection from an abandoned attempt, a third-party
// SDK fetch). It's environmental and non-actionable, so drop it. Only the
// exhausted-retry case reports, and it does so as a distinct wrapped error that
// no longer matches this signature. See GAP-FRONTEND-1Y2.
const TRANSIENT_WALLET_TIMEOUT_FRAGMENTS = ["could not coalesce", "wallet timeout"] as const;

/**
 * True when the error is a transient wallet/bundler timeout surfaced by ethers
 * ("could not coalesce error" / "Wallet timeout"). These are retried at the
 * send layer and are unactionable from a Sentry event; the exhausted-retry
 * failure reports separately as a distinct wrapped error.
 */
export function isTransientWalletTimeoutError(error: unknown): boolean {
  if (!error) return false;
  const message = getErrorMessage(error).toLowerCase();
  if (!message) return false;
  return TRANSIENT_WALLET_TIMEOUT_FRAGMENTS.some((fragment) => message.includes(fragment));
}

// Rate-limit pressure (HTTP 429) is expected load-shedding, not a first-party
// bug: the indexer caps public payout-config reads at 30 req/min/IP per route
// template, so a milestones page that fans out one request per grant can burst
// past the cap. The failed reads are retried by React Query and the affected UI
// is decorative (allocation badges), so these must not page Sentry. The service
// re-throws a `FetchDataError` carrying `status`, but SSR/re-wrapped paths can
// arrive as a bare message ("Rate limit exceeded. Try again later." /
// "Request failed with status code 429"), so match on both. See GAP-FRONTEND-245.
const RATE_LIMIT_MESSAGE_FRAGMENTS = ["rate limit exceeded", "status code 429"];

/**
 * True when the error represents an HTTP 429 rate-limit response — detected
 * either by status (`error.response.status` / `error.status`, incl.
 * `FetchDataError`) or by a rate-limit message fragment for re-wrapped errors
 * that lost their status. Used to suppress Sentry noise while still retrying.
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;
  if (getHttpStatus(error) === 429) return true;
  const message = getErrorMessage(error).toLowerCase();
  return RATE_LIMIT_MESSAGE_FRAGMENTS.some((fragment) => message.includes(fragment));
}

/**
 * True when the error is a transient upstream HTTP failure (gateway timeout
 * / bad gateway / service unavailable / request timeout). Unlike
 * `isTransientNetworkError`, these DO carry an HTTP response, so they need
 * their own predicate. Used to keep the frontend Sentry project clean of
 * indexer outages that crash SSR — the page still throws to its `error.tsx`
 * retry boundary, we just don't page on the unactionable minified event.
 * See DEV-271 / GAP-FRONTEND-1R1.
 */
export function isTransientHttpError(error: unknown): boolean {
  if (!error) return false;

  const status = getHttpStatus(error);
  if (status !== undefined && TRANSIENT_HTTP_STATUS.has(status)) return true;

  // SSR fetch failures bubble up as a re-thrown `Error` whose message is the
  // axios default ("Request failed with status code 504") with no `response`
  // attached — match the status off the message in that case.
  const message = getErrorMessage(error).toLowerCase();
  for (const code of TRANSIENT_HTTP_STATUS) {
    if (message.includes(`status code ${code}`)) return true;
  }
  return false;
}
