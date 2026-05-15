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
