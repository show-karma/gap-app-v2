import { ResultAsync } from "neverthrow";
import { ZodError, type ZodType, type z } from "zod";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";
import type { AppError } from "./errors";

/**
 * Base URL for all non-profits feature API calls.
 * Reads from the gap-app-v2 env var that all other services use.
 */
const BASE_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

/**
 * Low-level fetch helper used by `philanthropyService` and future non-profits
 * services.  Returns a `ResultAsync<T, AppError>` so callers can stay in the
 * neverthrow pipeline without try/catch.
 *
 * Differences from the grant-atlas original:
 * - `BASE_URL` comes from `envVars.NEXT_PUBLIC_GAP_INDEXER_URL` (Next.js env)
 *   instead of `import.meta.env.VITE_INDEXER_URL`.
 * - Authentication uses `TokenManager.getToken()` (gap-app-v2's Privy wrapper)
 *   instead of a global `setAuthTokenProvider` callback.
 * - `ZodTypeAny` is renamed to `ZodType` (Zod v4 API, Phase 0).
 */
export function apiFetch<S extends ZodType>(
  path: string,
  schema: S,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: unknown
): ResultAsync<z.infer<S>, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const headers: Record<string, string> = {};

      if (body) {
        headers["Content-Type"] = "application/json";
      }

      const token = await TokenManager.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const url = `${BASE_URL}${path}`;
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      // 204 No Content — no body to parse
      if (res.status === 204) {
        return undefined as z.infer<S>;
      }

      if (!res.ok) {
        const text = await res.text();
        let msg = `Request failed (${res.status})`;
        try {
          const json = JSON.parse(text) as { message?: string; error?: string };
          const raw = json.message ?? json.error;
          if (raw?.trim()) msg = raw.trim();
        } catch {
          if (text.trim()) msg = text.trim();
        }
        const apiErr: AppError = { type: "ApiError", status: res.status, message: msg };
        throw apiErr;
      }

      const raw = (await res.json()) as unknown;
      return schema.parse(raw) as z.infer<S>;
    })(),
    (err): AppError => {
      if (err instanceof ZodError) {
        return { type: "ValidationError", message: err.message, cause: err };
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        return { type: "AbortError" };
      }
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        return { type: "NetworkError", message: err.message };
      }
      // Re-surface AppErrors that were thrown inside the async block
      const appErr = err as AppError;
      if (appErr && typeof appErr === "object" && "type" in appErr) {
        return appErr;
      }
      return {
        type: "NetworkError",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  );
}
