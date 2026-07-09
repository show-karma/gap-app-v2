/**
 * SSR-safe fetch wrapper (backed by the typed `api` client) for use in
 * Next.js Server Components and route handlers. Unlike client-side calls
 * through `api` directly, this wrapper:
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

import { api } from "@/utilities/api/client";
import { envVars } from "@/utilities/enviromentVars";

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

  try {
    // TODO(#1775): add zod schema
    const { data } = await api.request<T>(method, endpoint, body, {
      isAuthorized: !!authToken,
      baseURL: BASE_URL,
      ...(Object.keys(headers).length ? { headers } : {}),
    });
    return data;
  } catch {
    // SUPPRESSED: SSR degrade-to-null is intentional — a missing/failed
    // fetch should render a graceful fallback shell, never crash the server.
    return null;
  }
}
