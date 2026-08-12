import axios, { type AxiosRequestConfig, type AxiosResponse, type Method } from "axios";
import type { ZodType } from "zod";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";
import { sanitizeObject } from "@/utilities/sanitize";
import {
  type ApiError,
  type ApiErrorContext,
  ContractViolationError,
  HttpError,
  isApiError,
  stripQuery,
  toApiError,
} from "./errors";
import { reportApiFailure } from "./report";
import { executeWithRetry, type RetryPolicy } from "./retry";

/** @public */
export interface PageInfo {
  totalItems?: number;
  page?: number;
  pageLimit?: number;
  /* passthrough */
  [k: string]: unknown;
}

/** @public */
export interface RequestOptions<T> {
  schema?: ZodType<T>;
  signal?: AbortSignal;
  timeoutMs?: number; // default 30_000 (360_000 for default/indexer baseURL — legacy long-poll ceiling)
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  retryAttempts?: number; // default: GET/HEAD server→3 / browser→1 ; mutations→1
  idempotencyKey?: string; // required to retry POST/PUT/PATCH/DELETE (>1 attempt)
  isAuthorized?: boolean; // default true (mirrors fetchData)
  baseURL?: string; // override singleton baseURL (adapter uses this for non-indexer calls)
  cache?: boolean; // legacy indexer ?cache= param passthrough (adapter parity)
}

/** @public */
export interface ApiClient {
  get<T = unknown>(path: string, opts?: RequestOptions<T>): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, opts?: RequestOptions<T>): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, opts?: RequestOptions<T>): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown, opts?: RequestOptions<T>): Promise<T>;
  delete<T = unknown>(path: string, opts?: RequestOptions<T>): Promise<T>;
  getPaginated<T = unknown>(
    path: string,
    opts?: RequestOptions<T>
  ): Promise<{ data: T; pageInfo: PageInfo | null }>;
  // low-level escape hatch used by the fetchData adapter — returns full
  // unwrapped payload + status + pageInfo:
  request<T = unknown>(
    method: string,
    path: string,
    body: unknown,
    opts?: RequestOptions<T>
  ): Promise<{ data: T; status: number; pageInfo: PageInfo | null }>;
}

interface ApiClientConfig {
  baseURL: string;
  getAuthToken?: () => Promise<string | null>;
  onAuthExpired?: () => Promise<string | null>;
  onExhausted?: (error: ApiError, attempts: number) => void;
}

const MAX_RETRY_AFTER_MS = 30_000;
const MAX_JITTER_BASE_MS = 1000;
const JITTER_STEP_MS = 250;
const DEFAULT_TIMEOUT_MS = 30_000;
// Legacy fetchData gave every default-baseURL (indexer) request a 360s
// ceiling for long-poll endpoints (AI evaluation, bulk jobs, report
// generation). Preserve that ceiling here so migrated call sites don't need
// to remember to pass timeoutMs individually.
const DEFAULT_INDEXER_TIMEOUT_MS = 360_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Copies passthrough entries into a nominally-typed PageInfo without any
 * cast — every field is assigned through PageInfo's own index signature
 * (`[k: string]: unknown`), which accepts `unknown` values directly.
 */
function toPageInfo(value: unknown): PageInfo | null {
  if (!isRecord(value)) return null;
  const pageInfo: PageInfo = {};
  for (const [key, entry] of Object.entries(value)) {
    pageInfo[key] = entry;
  }
  return pageInfo;
}

function toAxiosMethod(method: string): Method {
  switch (method.toUpperCase()) {
    case "GET":
      return "GET";
    case "POST":
      return "POST";
    case "PUT":
      return "PUT";
    case "PATCH":
      return "PATCH";
    case "DELETE":
      return "DELETE";
    case "HEAD":
      return "HEAD";
    case "OPTIONS":
      return "OPTIONS";
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
}

function isServerSide(): boolean {
  return typeof window === "undefined";
}

function fullJitterDelayMs(attempt: number): number {
  return Math.random() * Math.min(MAX_JITTER_BASE_MS, JITTER_STEP_MS * 2 ** attempt);
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const finalize = <T>(
    body: unknown,
    opts: RequestOptions<T>,
    endpoint: string,
    method: string
  ): T => {
    if (!opts.schema) {
      // The one sanctioned cast: converting an untyped JSON payload into the
      // caller-declared generic when no runtime schema was provided.
      return body as unknown as T;
    }

    const result = opts.schema.safeParse(body);
    if (!result.success) {
      throw new ContractViolationError({
        endpoint,
        method,
        issues: result.error.issues
          .slice(0, 10)
          .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
      });
    }
    return result.data;
  };

  const performRequest = async <T>(
    method: string,
    path: string,
    body: unknown,
    opts: RequestOptions<T>
  ): Promise<{
    body: unknown;
    status: number;
    pageInfo: PageInfo | null;
    ctx: ApiErrorContext;
  }> => {
    const upperMethod = method.toUpperCase();
    const axiosMethod = toAxiosMethod(upperMethod);
    const isAuthorized = opts.isAuthorized ?? true;
    const effectiveBaseURL = opts.baseURL ?? config.baseURL;
    const isDefaultBaseURL = effectiveBaseURL === config.baseURL;
    const timeoutMs =
      opts.timeoutMs ?? (isDefaultBaseURL ? DEFAULT_INDEXER_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);
    const endpoint = stripQuery(path);
    const ctx: ApiErrorContext = {
      endpoint,
      method: upperMethod,
      timeoutMs,
      signal: opts.signal,
    };

    const url = (() => {
      if (isDefaultBaseURL && opts.cache) {
        const separator = path.includes("?") ? "&" : "?";
        return `${effectiveBaseURL}${path}${separator}cache=${opts.cache}`;
      }
      return `${effectiveBaseURL}${path}`;
    })();

    const sanitizedBody = sanitizeObject(body ?? {});

    const buildConfig = (token: string | null): AxiosRequestConfig => ({
      url,
      method: axiosMethod,
      data: sanitizedBody,
      params: opts.params,
      headers: {
        ...opts.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey } : {}),
      },
      signal: opts.signal,
      timeout: timeoutMs,
    });

    const shouldAttachAuth = isAuthorized && isDefaultBaseURL && Boolean(config.getAuthToken);

    const doOnce = async (): Promise<AxiosResponse> => {
      const token = shouldAttachAuth && config.getAuthToken ? await config.getAuthToken() : null;
      try {
        return await axios.request(buildConfig(token));
      } catch (rawErr) {
        const apiErr = toApiError(rawErr, ctx);
        const canRefreshAuth =
          apiErr instanceof HttpError &&
          apiErr.status === 401 &&
          isAuthorized &&
          isDefaultBaseURL &&
          Boolean(config.onAuthExpired);

        if (canRefreshAuth && config.onAuthExpired) {
          const freshToken = await config.onAuthExpired();
          if (freshToken) {
            try {
              return await axios.request(buildConfig(freshToken));
            } catch (secondErr) {
              throw toApiError(secondErr, ctx);
            }
          }
        }
        throw apiErr;
      }
    };

    const isServer = isServerSide();
    const isIdempotent =
      upperMethod === "GET" || upperMethod === "HEAD" || Boolean(opts.idempotencyKey);
    const defaultAttempts = isServer && isIdempotent ? 3 : 1;
    const attempts = isServer ? Math.max(1, opts.retryAttempts ?? defaultAttempts) : 1;

    const retryPolicy: RetryPolicy = {
      attempts,
      signal: opts.signal,
      shouldRetry: (error) =>
        isServer && isIdempotent && !opts.signal?.aborted && isApiError(error) && error.retryable,
      delayMs: (attempt, error) => {
        if (error instanceof HttpError && error.retryAfterMs != null) {
          return Math.min(error.retryAfterMs, MAX_RETRY_AFTER_MS);
        }
        return fullJitterDelayMs(attempt);
      },
    };

    let attemptsMade = 0;
    try {
      const res = await executeWithRetry<AxiosResponse>(async () => {
        attemptsMade += 1;
        return doOnce();
      }, retryPolicy);

      const pageInfo = toPageInfo(isRecord(res.data) ? res.data.pageInfo : undefined);
      return { body: res.data, status: res.status, pageInfo, ctx };
    } catch (err) {
      const apiErr = isApiError(err) ? err : toApiError(err, ctx);
      // Only a genuine exhaustion of a RETRYABLE error reports to Sentry. A
      // single-attempt failure (every browser call, and every server
      // mutation/non-retryable error) never reports — matching legacy
      // fetchData behavior and keeping the 220 adapter call sites
      // (retryAttempts:1) silent as they are today. Requiring
      // `apiErr.retryable` also guards two mis-report cases: (1) a retried
      // 503 that terminates on a non-retryable status (e.g. 500) — the loop
      // stops because the FINAL error isn't retryable, not because retries
      // were exhausted; (2) a RequestAborted surfacing mid-retry — aborts are
      // never retryable and are caller-initiated, not a transport failure.
      if (attemptsMade > 1 && apiErr.retryable) config.onExhausted?.(apiErr, attemptsMade);
      throw apiErr;
    }
  };

  const request: ApiClient["request"] = async (method, path, body, opts = {}) => {
    const {
      body: responseBody,
      status,
      pageInfo,
      ctx,
    } = await performRequest(method, path, body, opts);
    return {
      data: finalize(responseBody, opts, ctx.endpoint, ctx.method),
      status,
      pageInfo,
    };
  };

  return {
    get: <T = unknown>(path: string, opts: RequestOptions<T> = {}) =>
      request<T>("GET", path, undefined, opts).then((r) => r.data),
    post: <T = unknown>(path: string, body?: unknown, opts: RequestOptions<T> = {}) =>
      request<T>("POST", path, body, opts).then((r) => r.data),
    put: <T = unknown>(path: string, body?: unknown, opts: RequestOptions<T> = {}) =>
      request<T>("PUT", path, body, opts).then((r) => r.data),
    patch: <T = unknown>(path: string, body?: unknown, opts: RequestOptions<T> = {}) =>
      request<T>("PATCH", path, body, opts).then((r) => r.data),
    delete: <T = unknown>(path: string, opts: RequestOptions<T> = {}) =>
      request<T>("DELETE", path, undefined, opts).then((r) => r.data),
    getPaginated: async <T = unknown>(path: string, opts: RequestOptions<T> = {}) => {
      const { body, pageInfo, ctx } = await performRequest("GET", path, undefined, opts);
      if (!isRecord(body) || !("data" in body)) {
        throw new ContractViolationError({
          endpoint: ctx.endpoint,
          method: ctx.method,
          issues: ["expected paginated envelope { data, pageInfo }"],
        });
      }
      return { data: finalize(body.data, opts, ctx.endpoint, ctx.method), pageInfo };
    },
    request,
  };
}

export const api: ApiClient = createApiClient({
  baseURL: envVars.NEXT_PUBLIC_GAP_INDEXER_URL,
  getAuthToken: () => TokenManager.getToken(),
  onAuthExpired: async () => {
    TokenManager.clearCache();
    return TokenManager.getToken();
  },
  onExhausted: (error, attempts) => reportApiFailure(error, { attempts }),
});

// #1775: unified typed API client — see utilities/api/README.md
