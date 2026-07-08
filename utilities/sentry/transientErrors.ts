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

const TRANSIENT_MESSAGE_FRAGMENTS = [
  "network error",
  "failed to fetch",
  "load failed",
  // Node/undici socket blips that crash SSR fetches. The dominant signature
  // is "Client network socket disconnected before secure TLS connection was
  // established" (matched by the fragment below) plus bare "socket hang up".
  // These are transient upstream/socket resets during a server render with no
  // actionable first-party frame. See GAP-FRONTEND-1Y9 (and siblings -1YD /
  // -1YA / -1YB / -1YP).
  "socket hang up",
  "socket disconnected before secure tls",
];

const TRANSIENT_AXIOS_CODES = new Set([
  "ERR_NETWORK",
  "ERR_INTERNET_DISCONNECTED",
  "ERR_CONNECTION_RESET",
  "ECONNABORTED",
  "ETIMEDOUT",
]);

// Node/undici socket-level error codes that surface during SSR when the
// connection to the indexer is reset/dropped before (or mid) a response.
// Native `fetch` wraps these as `TypeError: fetch failed` with the coded
// error on `.cause`, so classification also walks `error.cause` one level.
// These are environmental and unactionable from a frontend Sentry event —
// the right behavior is to retry the idempotent request on the server and
// keep the signal clean. See GAP-FRONTEND-1Y9 (siblings -1YD/-1YA/-1YB/-1YP).
const TRANSIENT_SOCKET_CODES = new Set([
  "ECONNRESET",
  "EPIPE",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
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

// Native `fetch` (undici) reports connection failures as
// `TypeError: fetch failed` with the coded socket error hidden on `.cause`.
// Return that nested cause so code/message extraction can walk one level
// down. See GAP-FRONTEND-1Y9.
function getErrorCause(error: unknown): unknown {
  if (error && typeof error === "object" && "cause" in error) {
    return (error as { cause?: unknown }).cause;
  }
  return undefined;
}

function getOwnMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "";
}

// Combines the error's own message with its `.cause` message (one level) so
// undici's opaque `fetch failed` wrapper still exposes the underlying socket
// signature to fragment matching. See GAP-FRONTEND-1Y9.
function getErrorMessage(error: unknown): string {
  const own = getOwnMessage(error);
  const causeMsg = getOwnMessage(getErrorCause(error));
  if (own && causeMsg) return `${own} ${causeMsg}`;
  return own || causeMsg;
}

function getOwnCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

// Reads the error's own `code`, falling back to `error.cause.code` (one
// level) for undici's `fetch failed` wrapper. See GAP-FRONTEND-1Y9.
function getErrorCode(error: unknown): string | undefined {
  return getOwnCode(error) ?? getOwnCode(getErrorCause(error));
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
 * True when the error is a transient Node/undici socket failure with no HTTP
 * response attached — a connection reset/hang-up/DNS blip that crashes an SSR
 * fetch. Matches by socket error code (`ECONNRESET`, `EPIPE`, `EAI_AGAIN`,
 * `ECONNREFUSED`, `UND_ERR_SOCKET`, `UND_ERR_CONNECT_TIMEOUT`) — including
 * codes hidden on `error.cause` behind undici's `TypeError: fetch failed`
 * wrapper — or by message fragment ("socket hang up", the TLS-handshake reset
 * "Client network socket disconnected before secure TLS connection was
 * established"). Folded into `isTransientNetworkError` so both Sentry
 * `beforeSend` hooks and `errorManager` suppress it automatically. See
 * GAP-FRONTEND-1Y9 (siblings -1YD/-1YA/-1YB/-1YP).
 */
export function isTransientSocketError(error: unknown): boolean {
  if (!error) return false;
  if (hasHttpResponse(error)) return false;

  const code = getErrorCode(error);
  if (code && TRANSIENT_SOCKET_CODES.has(code)) return true;

  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("socket hang up") || message.includes("socket disconnected before secure tls")
  );
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

  // Node/undici socket resets/hang-ups that crash SSR fetches. See
  // GAP-FRONTEND-1Y9.
  if (isTransientSocketError(error)) return true;

  const message = getErrorMessage(error).toLowerCase();
  return TRANSIENT_MESSAGE_FRAGMENTS.some((fragment) => message.includes(fragment));
}

/**
 * True when a failed *idempotent* fetch should be retried on the server. This
 * is deliberately NARROWER than `isTransientNetworkError`:
 *
 *   - NOT an abort (a cancelled request must never be retried), AND
 *   - a transient upstream HTTP error (502/503/504/408), OR
 *   - no HTTP response AND a transient socket error (`ECONNRESET`, TLS
 *     handshake reset, "socket hang up", etc.).
 *
 * Deliberately EXCLUDES the axios timeout codes `ECONNABORTED` / `ETIMEDOUT`:
 * the per-attempt indexer timeout is already 360s, so there is no time budget
 * to retry a timed-out request within a Vercel function. Also excludes 429
 * (rate limiting — retrying makes it worse). See GAP-FRONTEND-1Y9.
 */
export function isRetryableIdempotentFetchError(error: unknown): boolean {
  if (!error) return false;
  if (isAxiosAbortError(error)) return false;

  // Transient upstream gateway failure (502/503/504/408) — retryable
  // regardless of whether the status is on `.response.status` or only in the
  // re-thrown axios message.
  if (isTransientHttpError(error)) return true;

  // Otherwise only socket-level resets with no HTTP response qualify. Axios
  // timeout codes (`ECONNABORTED`/`ETIMEDOUT`) and 429 are intentionally
  // excluded (see doc comment).
  return !hasHttpResponse(error) && isTransientSocketError(error);
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
