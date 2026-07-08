import type { Method } from "axios";
import { api } from "./api/client";
import { HttpError, isApiError } from "./api/errors";
import { envVars } from "./enviromentVars";

/**
 * Fetch data utility — thin legacy adapter over the typed `api` client
 * (see `utilities/api/README.md`).
 *
 * DEPRECATED: this preserves the historical `[data, error, pageInfo, status]`
 * tuple contract for the ~220 existing call sites. All transport (auth
 * header attachment, 401-refresh-once, timeouts, the indexer `?cache=`
 * param, and error classification) is now implemented once in
 * `utilities/api/client.ts` — this file only translates between that typed
 * client and the legacy tuple shape. New code should call `api.get` /
 * `api.post` / `api.put` / `api.patch` / `api.delete` directly with a zod
 * `schema` instead of adding new callers of this function.
 *
 * The optional `signal` is forwarded to the client so a long-running request
 * is cancelled when the caller aborts — used by the milestone-completion
 * polling hook to halt in-flight fetches when a component unmounts mid-
 * poll. Without it, an aborted poll iteration still completes its
 * current request before the next abort check fires.
 *
 * **Caller contract** when passing `signal`: an aborted request lands in
 * the catch path below as a `RequestAborted` (mapped to the raw cause, or
 * the `RequestAborted` instance itself if no cause is available) in the
 * error slot; callers should use `isAbortError(err)` (from
 * `utilities/retries`) when inspecting the error to distinguish
 * cancellation from real failures.
 *
 * @template T - Optional type parameter for response data (defaults to any for backward compatibility)
 * @returns Promise<[T, null, any, number] | [null, string, null, number]> - Tuple of [data, error, pageInfo, status]
 */
export default async function fetchData<T = any>(
  endpoint: string,
  method: Method = "GET",
  axiosData = {},
  params = {},
  headers = {},
  isAuthorized = true,
  cache: boolean | undefined = false,
  baseUrl: string = envVars.NEXT_PUBLIC_GAP_INDEXER_URL,
  signal?: AbortSignal
): Promise<[T, null, any, number] | [null, string, null, number]> {
  const isIndexerUrl = baseUrl === envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

  try {
    const { data, status, pageInfo } = await api.request<T>(method, endpoint, axiosData, {
      params,
      headers,
      isAuthorized,
      cache,
      baseURL: baseUrl,
      signal,
      // Indexer requests get a generous timeout regardless of token presence
      // (see the module doc above); non-indexer requests keep the default
      // so a hung connection surfaces as an error instead of hanging the UI.
      timeoutMs: isIndexerUrl ? 360000 : 30000,
      // The legacy fetchData never retried — preserve that exactly so this
      // rewrite is behavior-neutral for the 220 existing call sites.
      retryAttempts: 1,
    });
    return [data, null, pageInfo, status];
  } catch (err: any) {
    if (isApiError(err)) {
      if (err instanceof HttpError) {
        // Legacy fetchData returned `err.response.data.message || err.message`,
        // where `err.message` was the ORIGINAL axios error message. The client
        // now preserves that original message on `err.cause`, so fall back to
        // it before the synthetic `HttpError.message` ("HTTP 504 GET /path").
        const bodyMessage = (err.body as { message?: string } | undefined)?.message;
        const causeMessage = (err.cause as { message?: string } | undefined)?.message;
        return [null, bodyMessage ?? causeMessage ?? err.message, null, err.status];
      }
      // Network / timeout / aborted / contract-violation: preserve the
      // legacy behavior of surfacing the *original* underlying error object
      // (not a stringified message) in the tuple's error slot — existing
      // callers coerce it to a string themselves (e.g. `String(error)` or
      // `error.message`), see __tests__/regression/error-includes-crash.test.ts.
      // The tuple's declared type says `string` here for backward
      // compatibility with the pre-existing (inaccurate) signature — the
      // legacy implementation had the same mismatch via `catch (err: any)`.
      const cause = err.cause;
      return [null, (cause ?? err) as string, null, 500];
    }
    // Defensive fallback: the client's contract guarantees every rejection
    // from `api.request()` is mapped to an ApiError, so this path should be
    // unreachable — kept only so a future contract break degrades to the
    // old "raw error object" behavior instead of throwing out of fetchData.
    return [null, err, null, 500];
  }
}
