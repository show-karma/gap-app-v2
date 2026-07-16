import axios, { type AxiosRequestConfig, type AxiosResponse, type Method } from "axios";
import { TokenManager } from "@/utilities/auth/token-manager";
import { executeWithRetry } from "@/utilities/fetchRetry";
import { reportTransientFetchFailure } from "@/utilities/sentry/reportTransientFetchFailure";
import { envVars } from "./enviromentVars";
import { sanitizeObject } from "./sanitize";

/**
 * Pagination metadata returned by indexer list endpoints.
 */
export interface PageInfo {
  totalItems?: number;
  page?: number;
  pageLimit?: number;
  [key: string]: unknown;
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
 * @returns Promise<[T, null, PageInfo | null, number] | [null, string, null, number]> - Tuple of [data, error, pageInfo, status]
 */
// biome-ignore lint/suspicious/noExplicitAny: the `any` default keeps hundreds of legacy untyped call sites compiling; new callers should pass an explicit T.
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
): Promise<[T, null, PageInfo | null, number] | [null, string, null, number]> {
  try {
    const sanitizedData = sanitizeObject(axiosData);
    const isIndexerUrl = baseUrl === envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

    const requestHeaders: Record<string, string> = {
      ...headers,
    };
    const requestConfig: AxiosRequestConfig = {
      url: isIndexerUrl
        ? `${baseUrl}${endpoint}${
            cache ? `${endpoint.includes("?") ? "&" : "?"}cache=${cache}` : ""
          }`
        : `${baseUrl}${endpoint}`,
      method,
      data: sanitizedData,
      params,
      headers: requestHeaders,
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
          requestHeaders.Authorization = `Bearer ${token}`;
        }
      }
    }

    // A single request attempt, including the per-attempt 401-refresh retry.
    // Wrapped by `executeWithRetry` below so transient SSR socket/gateway
    // failures (GAP-FRONTEND-1Y9 and siblings) are retried on the server for
    // idempotent GET/HEAD requests. The 401 refresh stays inside an attempt so
    // each retried request re-derives a fresh token.
    const attemptRequest = async (): Promise<AxiosResponse<T & { pageInfo?: PageInfo }>> => {
      try {
        return await axios.request<T & { pageInfo?: PageInfo }>(requestConfig);
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
          requestHeaders.Authorization = `Bearer ${freshToken}`;
          return await axios.request<T & { pageInfo?: PageInfo }>(requestConfig);
        }
        throw err;
      }
    };

    const res = await executeWithRetry(attemptRequest, {
      method,
      signal,
      onExhausted: (error, attempts) => {
        reportTransientFetchFailure({ endpoint, method, attempts, error });
      },
    });

    const resData = res.data;
    const pageInfo = resData?.pageInfo || null;
    return [resData, null, pageInfo, res.status];
  } catch (err) {
    let error: unknown = "";
    let status = 500;
    const response = (err as { response?: { data?: { message?: string }; status?: number } })
      ?.response;
    if (!response) {
      error = err;
    } else {
      error = response.data?.message || (err as { message?: string }).message || "Request failed";
      status = response.status ?? 500;
    }
    return [null, error as string, null, status];
  }
}
