import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import toast from "react-hot-toast";
import { envVars } from "../enviromentVars";
import { TokenManager } from "./token-manager";

/**
 * Retry policy for transient backend unavailability (e.g. while the API is
 * redeploying and briefly refuses connections). Defaults bridge a ~20-30s
 * rolling restart with exponential backoff, surfacing a single "Reconnecting…"
 * toast once a request has visibly stalled.
 */
export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: number;
  reconnectToastAfterAttempt: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  retries: 6,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  jitter: 0.3,
  reconnectToastAfterAttempt: 2,
};

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
  _retryCount?: number;
  _reconnectingShown?: boolean;
}

// Methods that are safe to replay because the server reaches the same state
// whether the request ran once or twice.
const IDEMPOTENT_METHODS = new Set(["get", "head", "options", "put", "delete"]);

/**
 * Decides whether a failed request is a transient backend-availability issue
 * worth retrying, while never replaying a write that may have already taken
 * effect.
 */
function isTransientlyRetryable(error: AxiosError, config: RetryableRequestConfig): boolean {
  // A caller-cancelled request (React Query abort on unmount/refetch) is not a
  // failure to retry — replaying it would defeat the cancellation.
  if (axios.isCancel(error) || error.code === "ERR_CANCELED") return false;

  const idempotent = IDEMPOTENT_METHODS.has((config.method || "get").toLowerCase());

  if (!error.response) {
    // No HTTP response: connection refused, DNS failure, CORS/preflight block,
    // or timeout. A timed-out write may have reached the server, so only retry
    // idempotent methods; a connection-level failure never reached the app and
    // is safe to retry for any method.
    const isTimeout = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
    return isTimeout ? idempotent : true;
  }

  switch (error.response.status) {
    case 502:
      return idempotent; // app may have crashed mid-request
    case 503:
    case 504:
      return true; // gateway never got a healthy response from the app
    case 429:
      return true; // rejected before processing
    default:
      return false;
  }
}

function parseRetryAfterMs(headerValue: unknown): number | null {
  if (typeof headerValue !== "string" || headerValue.trim() === "") return null;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(headerValue);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

function backoffDelayMs(attempt: number, error: AxiosError, opts: RetryOptions): number {
  const retryAfter = parseRetryAfterMs(error.response?.headers?.["retry-after"]);
  if (retryAfter != null) return Math.min(retryAfter, opts.maxDelayMs * 2);
  const exp = Math.min(opts.baseDelayMs * 2 ** (attempt - 1), opts.maxDelayMs);
  return exp + exp * opts.jitter * Math.random();
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A single shared "Reconnecting…" toast across every client instance and
// concurrent request, reference-counted so it appears once and clears when the
// last stalled request resolves.
const RECONNECT_TOAST_ID = "api-client-reconnecting";
let reconnectingCount = 0;

function showReconnecting() {
  reconnectingCount += 1;
  if (reconnectingCount === 1 && typeof window !== "undefined") {
    toast.loading("Reconnecting…", { id: RECONNECT_TOAST_ID });
  }
}

function clearReconnecting() {
  if (reconnectingCount === 0) return;
  reconnectingCount -= 1;
  if (reconnectingCount === 0 && typeof window !== "undefined") {
    toast.dismiss(RECONNECT_TOAST_ID);
  }
}

function endReconnecting(config?: RetryableRequestConfig) {
  if (config?._reconnectingShown) {
    config._reconnectingShown = false;
    clearReconnecting();
  }
}

/**
 * Creates an authenticated axios instance for API calls
 * This function creates an axios instance with interceptors that:
 * 1. Automatically adds the auth token to requests
 * 2. Handles 401 responses by refreshing the token and retrying once
 * 3. Retries transient failures (backend redeploying / unreachable) with backoff
 */
export function createAuthenticatedApiClient(
  baseURL: string = envVars.NEXT_PUBLIC_GAP_INDEXER_URL,
  timeout = 30000,
  retryOptions: Partial<RetryOptions> = {}
): AxiosInstance {
  const retry: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };

  const apiClient = axios.create({
    baseURL,
    timeout,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Add request interceptor for authentication
  apiClient.interceptors.request.use(async (config) => {
    // Get auth token from store
    const token = await TokenManager.getToken();
    if (token) {
      // Ensure Bearer prefix is present for standard HTTP authorization
      config.headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    }
    return config;
  });

  // Add response interceptor for 401 token refresh + transient-failure retry
  apiClient.interceptors.response.use(
    (response) => {
      endReconnecting(response.config as RetryableRequestConfig);
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryableRequestConfig | undefined;

      // Only attempt refresh once per request to avoid infinite loops
      if (error.response?.status === 401 && originalRequest && !originalRequest._retried) {
        originalRequest._retried = true;

        // Clear cached token so next getToken() fetches a fresh one
        TokenManager.clearCache();

        const freshToken = await TokenManager.getToken();
        if (freshToken) {
          originalRequest.headers.Authorization = freshToken.startsWith("Bearer ")
            ? freshToken
            : `Bearer ${freshToken}`;
          return apiClient.request(originalRequest);
        }
      }

      // Retry transient backend-availability failures with exponential backoff
      if (originalRequest && isTransientlyRetryable(error, originalRequest)) {
        const attempt = (originalRequest._retryCount || 0) + 1;
        if (attempt <= retry.retries) {
          originalRequest._retryCount = attempt;
          if (attempt >= retry.reconnectToastAfterAttempt && !originalRequest._reconnectingShown) {
            originalRequest._reconnectingShown = true;
            showReconnecting();
          }
          await sleep(backoffDelayMs(attempt, error, retry));
          return apiClient.request(originalRequest);
        }
      }

      endReconnecting(originalRequest);
      return Promise.reject(error);
    }
  );

  return apiClient;
}
