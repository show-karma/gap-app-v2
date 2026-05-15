import axios, { type Method } from "axios";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "./enviromentVars";
import { sanitizeObject } from "./sanitize";

/**
 * Stable sentinel returned by `fetchData` when the caller requested an
 * authorized indexer request but no Privy token is available.
 *
 * Without this guard `fetchData` would still fire the request without an
 * `Authorization` header, the indexer would reply with a 401
 * (`Authorization header is required`), and the error would be reported to
 * Sentry. See DEV-256 for the production incident this prevents.
 *
 * Exported so callers (and Sentry's `ignoreErrors` filter) can match against
 * it instead of doing fragile substring checks on a free-form message.
 */
export const AUTH_REQUIRED_NO_TOKEN_ERROR = "AUTH_REQUIRED_NO_TOKEN";

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
    };

    // Add authorization header if needed
    if (isIndexerUrl && isAuthorized) {
      // Get token from TokenManager (which uses Privy)
      const token = await TokenManager.getToken();

      // Short-circuit before firing a token-less request to the indexer.
      // Previously this branch silently sent the request anyway, producing
      // a 401 (`Authorization header is required`) that polluted Sentry on
      // every anonymous visit to a public page (DEV-256). Returning the
      // stable error tuple here keeps caller error-handling unchanged.
      if (!token) {
        return [null, AUTH_REQUIRED_NO_TOKEN_ERROR, null, 401];
      }

      requestConfig.headers.Authorization = `Bearer ${token}`;
      requestConfig.timeout = 360000;
    }

    const res = await axios.request<T & { pageInfo?: any }>(requestConfig);
    const resData = res.data;
    const pageInfo = resData?.pageInfo || null;
    return [resData, null, pageInfo, res.status];
  } catch (err: any) {
    let error = "";
    let status = 500;
    if (!err.response) {
      error = err;
    } else {
      error = err.response.data.message || err.message;
      status = err.response.status;
    }
    return [null, error, null, status];
  }
}
