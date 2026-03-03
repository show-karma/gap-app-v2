/**
 * SSR-safe fetchData wrapper for use in Next.js Server Components and
 * route handlers. Unlike client-side fetchData, this wrapper:
 *
 * - Swallows errors and returns null (appropriate for SSR — missing data
 *   should render a graceful shell, not crash the server)
 * - Passes `isAuthorized = false` by default (no Privy token on server)
 * - Accepts an optional auth token for server-side authenticated fetches
 *
 * Usage:
 * ```ts
 * const data = await serverFetch<Application>("/v2/funding-applications/123");
 * // data is null if the fetch fails — render a fallback
 * ```
 */

import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";

const BASE_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

export async function serverFetch<T>(
  endpoint: string,
  options: {
    authToken?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: Record<string, unknown>;
  } = {}
): Promise<T | null> {
  const { authToken, method = "GET", body = {} } = options;
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const [data, error] = await fetchData<T>(
    endpoint,
    method,
    body,
    {},
    headers,
    !!authToken,
    false,
    BASE_URL
  );

  if (error || data === null) return null;
  return data;
}
