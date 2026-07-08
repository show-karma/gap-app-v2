import axios, { type AxiosResponse, type Method } from "axios";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "./enviromentVars";
import { sanitizeObject } from "./sanitize";

/**
 * Error thrown by {@link fetchDataThrow} (and constructed by services that
 * need to surface the HTTP status to the data layer). Unlike the bare `Error`
 * that services used to re-throw, this carries the numeric `status` so that
 * `utilities/queries/defaultOptions.ts` can apply status-aware retry policy
 * and `errorManager` can suppress expected rate-limit noise. `retryAfterMs`
 * mirrors an upstream `Retry-After` header when the server sends one.
 */
export class FetchDataError extends Error {
  status?: number;
  retryAfterMs?: number;

  constructor(message: string, status?: number, retryAfterMs?: number) {
    super(message);
    this.name = "FetchDataError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Parses an HTTP `Retry-After` header value into milliseconds.
 * The header is either a non-negative integer number of seconds ("120") or an
 * HTTP-date. Returns `undefined` when the value is absent or unparseable so
 * callers can fall back to their own backoff schedule.
 */
export function parseRetryAfterMs(headerValue: unknown): number | undefined {
  if (headerValue === undefined || headerValue === null) return undefined;
  const raw = String(headerValue).trim();
  if (!raw) return undefined;

  // Delta-seconds form.
  if (/^\d+$/.test(raw)) {
    return Number(raw) * 1000;
  }

  // HTTP-date form: clamp to >= 0 so a slightly-past date doesn't yield a
  // negative delay.
  const dateMs = Date.parse(raw);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return undefined;
}

/**
 * Internal fetch core shared by {@link fetchData} (tuple contract) and
 * {@link fetchDataThrow} (throwing contract). Returns a normalized result
 * object so the throwing variant can also surface the HTTP status and any
 * `Retry-After` hint — data the flat tuple has no room for.
 */
async function runFetch<T = any>(
  endpoint: string,
  method: Method = "GET",
  axiosData = {},
  params = {},
  headers = {},
  isAuthorized = true,
  cache: boolean | undefined = false,
  baseUrl: string = envVars.NEXT_PUBLIC_GAP_INDEXER_URL,
  signal?: AbortSignal
): Promise<{
  data: T | null;
  error: unknown;
  pageInfo: unknown;
  status: number;
  retryAfterMs?: number;
}> {
  try {
    const sanitizedData = sanitizeObject(axiosData);
    const isIndexerUrl = baseUrl === envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

    const requestConfig: any = {
      url: isIndexerUrl
        ? `${baseUrl}${endpoint}${
            cache ? `${endpoint.includes("?") ? "&" : "?"}cache=${cache}` : ""
          }`
        : `${baseUrl}${endpoint}`,
      method,
      data: sanitizedData,
      params,
      headers: {
        ...headers,
      },
      signal,
      // Default timeout for all requests so a hung connection surfaces as
      // an axios error the data layer can retry instead of leaving the UI
      // in an indefinite loading state. Authorized indexer requests below
      // keep their longer ceiling for legacy long-poll endpoints.
      timeout: 30000,
    };

    // Indexer requests get a generous timeout regardless of token presence.
    // Anonymous calls hit optional-auth routes and shouldn't run unbounded
    // (axios defaults to 0 = no timeout) just because no Privy token exists.
    if (isIndexerUrl) {
      requestConfig.timeout = 360000;

      if (isAuthorized) {
        const token = await TokenManager.getToken();
        if (token) {
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }
      }
    }

    let res: AxiosResponse<T & { pageInfo?: any }>;
    try {
      res = await axios.request<T & { pageInfo?: any }>(requestConfig);
    } catch (err) {
      // Retry once on 401 for authorized indexer requests. The token may have
      // been absent or stale because Privy had not finished bootstrapping when
      // the request fired (the deferred-SDK auth race). Without this, fetchData
      // swallows the 401 into a "successful" null tuple below, so React Query
      // treats it as empty data and never refetches — a manual page refresh is
      // the only recovery. Re-fetching a fresh token and retrying self-heals it.
      const status = (err as { response?: { status?: number } } | null)?.response?.status;
      if (isIndexerUrl && isAuthorized && status === 401) {
        TokenManager.clearCache();
        const freshToken = await TokenManager.getToken();
        if (!freshToken) throw err;
        requestConfig.headers.Authorization = `Bearer ${freshToken}`;
        res = await axios.request<T & { pageInfo?: any }>(requestConfig);
      } else {
        throw err;
      }
    }
    const resData = res.data;
    const pageInfo = resData?.pageInfo || null;
    return { data: resData, error: null, pageInfo, status: res.status };
  } catch (err: any) {
    let error: unknown = "";
    let status = 500;
    let retryAfterMs: number | undefined;
    if (!err.response) {
      error = err;
    } else {
      error = err.response.data.message || err.message;
      status = err.response.status;
      retryAfterMs = parseRetryAfterMs(err.response.headers?.["retry-after"]);
    }
    return { data: null, error, pageInfo: null, status, retryAfterMs };
  }
}

/**
 * Fetch data utility that uses Privy's TokenManager for authentication
 *
 * This replaces the complex cookie-based token retrieval with
 * Privy's simplified token management.
 *
 * The optional `signal` is forwarded to axios so a long-running request
 * is cancelled when the caller aborts — used by the milestone-completion
 * polling hook to halt in-flight fetches when a component unmounts mid-
 * poll. Without it, an aborted poll iteration still completes its
 * current request before the next abort check fires.
 *
 * **Caller contract** when passing `signal`: an aborted request lands in
 * the catch path as an axios cancel error. The function returns the
 * standard `[null, error, null, status]` tuple in that case; callers
 * should use `isAbortError(err)` (from `utilities/retries`) when
 * inspecting the error to distinguish cancellation from real failures.
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
  const result = await runFetch<T>(
    endpoint,
    method,
    axiosData,
    params,
    headers,
    isAuthorized,
    cache,
    baseUrl,
    signal
  );
  if (result.error !== null) {
    // The tuple's error slot is typed `string` but has historically carried
    // the raw error object when no HTTP response was attached — preserved
    // as-is for the many existing callers that rely on that shape.
    return [null, result.error as string, null, result.status];
  }
  return [result.data as T, null, result.pageInfo, result.status];
}

/**
 * Throwing variant of {@link fetchData}. On success it returns the response
 * body directly; on failure it throws a {@link FetchDataError} carrying the
 * HTTP status and any `Retry-After` hint. Use this from React Query queryFns
 * that want status-aware retry/Sentry handling without unpacking the tuple.
 * The tuple contract of {@link fetchData} is unchanged for existing callers.
 */
export async function fetchDataThrow<T = any>(
  endpoint: string,
  method: Method = "GET",
  axiosData = {},
  params = {},
  headers = {},
  isAuthorized = true,
  cache: boolean | undefined = false,
  baseUrl: string = envVars.NEXT_PUBLIC_GAP_INDEXER_URL,
  signal?: AbortSignal
): Promise<T> {
  const result = await runFetch<T>(
    endpoint,
    method,
    axiosData,
    params,
    headers,
    isAuthorized,
    cache,
    baseUrl,
    signal
  );
  if (result.error !== null) {
    const message =
      typeof result.error === "string"
        ? result.error
        : result.error instanceof Error
          ? result.error.message
          : "Request failed";
    throw new FetchDataError(message, result.status, result.retryAfterMs);
  }
  return result.data as T;
}
