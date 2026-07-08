/**
 * Typed API error taxonomy for the unified API client (issue #1775, Phase 1).
 *
 * Every rejection that can escape the client MUST be normalized into one of
 * the concrete `ApiError` subclasses below via `toApiError`. This keeps
 * `retryable`/`expected` decisions, Sentry reporting policy, and the
 * degrade/throw/status-branch codemod patterns (Phase 3) all working off a
 * single, closed set of shapes instead of duck-typing raw AxiosError/undici
 * errors at every call site.
 */

/**
 * Discriminant for exhaustive `switch` over API failures.
 * @public
 */
export type ApiErrorKind = "http" | "network" | "timeout" | "aborted" | "contract";

/**
 * Base class for every classified API failure. Concrete subclasses fix
 * `kind`/`retryable`/`expected` as literal values so callers can discriminate
 * on `kind` or fall back to `instanceof`.
 */
export abstract class ApiError extends Error {
  abstract readonly kind: ApiErrorKind;
  abstract readonly retryable: boolean;
  abstract readonly expected: boolean;
  /** Path only — query string is stripped for PII hygiene. */
  readonly endpoint: string;
  /** Always uppercased (GET, POST, ...). */
  readonly method: string;

  constructor(message: string, opts: { endpoint: string; method: string; cause?: unknown }) {
    super(message, { cause: opts.cause });
    this.name = new.target.name;
    this.endpoint = stripQuery(opts.endpoint);
    this.method = opts.method.toUpperCase();
  }
}

/** Statuses worth an automatic retry: request timeout + upstream/gateway blips. */
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 502, 503, 504]);

/** A response came back with a non-2xx status. */
export class HttpError extends ApiError {
  readonly kind = "http";
  readonly status: number;
  readonly body?: unknown;
  readonly retryAfterMs?: number;
  readonly retryable: boolean;
  readonly expected: boolean;

  constructor(
    status: number,
    opts: {
      endpoint: string;
      method: string;
      cause?: unknown;
      body?: unknown;
      retryAfterMs?: number;
    }
  ) {
    super(`HTTP ${status} ${opts.method.toUpperCase()} ${stripQuery(opts.endpoint)}`, opts);
    this.status = status;
    this.body = opts.body;
    this.retryAfterMs = opts.retryAfterMs;
    this.retryable = RETRYABLE_HTTP_STATUSES.has(status);
    this.expected = status === 429;
  }
}

/** No HTTP response at all — DNS failure, connection reset, offline, CORS, etc. */
export class NetworkError extends ApiError {
  readonly kind = "network";
  readonly code?: string;
  readonly retryable = true;
  readonly expected = true;

  constructor(opts: {
    endpoint: string;
    method: string;
    cause?: unknown;
    code?: string;
    message?: string;
  }) {
    super(
      opts.message ?? `Network error: ${opts.method.toUpperCase()} ${stripQuery(opts.endpoint)}`,
      opts
    );
    this.code = opts.code;
  }
}

/** Request exceeded its per-attempt deadline (ECONNABORTED/ETIMEDOUT, no response). */
export class TimeoutError extends ApiError {
  readonly kind = "timeout";
  readonly timeoutMs: number;
  readonly retryable = false;
  readonly expected = true;

  constructor(opts: { endpoint: string; method: string; cause?: unknown; timeoutMs: number }) {
    super(
      `Request timed out after ${opts.timeoutMs}ms: ${opts.method.toUpperCase()} ${stripQuery(opts.endpoint)}`,
      opts
    );
    this.timeoutMs = opts.timeoutMs;
  }
}

/** Caller-initiated cancellation (AbortController, route change, unmount). */
export class RequestAborted extends ApiError {
  readonly kind = "aborted";
  readonly retryable = false;
  readonly expected = true;

  constructor(opts: { endpoint: string; method: string; cause?: unknown }) {
    super(`Request aborted: ${opts.method.toUpperCase()} ${stripQuery(opts.endpoint)}`, opts);
  }
}

/** A 2xx response body failed schema validation. */
export class ContractViolationError extends ApiError {
  readonly kind = "contract";
  readonly issues: string[];
  readonly retryable = false;
  readonly expected = false;

  constructor(opts: { endpoint: string; method: string; cause?: unknown; issues: string[] }) {
    super(
      `Response failed schema validation: ${opts.method.toUpperCase()} ${stripQuery(opts.endpoint)}`,
      opts
    );
    this.issues = opts.issues;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Retry-After can be either an integer number of seconds, or an HTTP-date
 * naming the moment the retry window opens. Returns milliseconds, clamped to
 * [0, 120_000] for the date form so a clock-skewed/absurd header can't stall
 * a retry loop indefinitely. Returns `undefined` for anything unparseable.
 */
export function parseRetryAfterMs(headerValue: unknown): number | undefined {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (typeof raw !== "string" && typeof raw !== "number") return undefined;

  const value = String(raw).trim();
  if (value === "") return undefined;

  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    return Number.isFinite(seconds) ? seconds * 1000 : undefined;
  }

  const dateMs = Date.parse(value);
  if (Number.isNaN(dateMs)) return undefined;
  return Math.min(120_000, Math.max(0, dateMs - Date.now()));
}

const MAX_CAUSE_DEPTH = 5;

function getErrorCodeAtDepth(error: unknown, depth: number): string | undefined {
  if (depth > MAX_CAUSE_DEPTH || !isRecord(error)) return undefined;
  const code = error.code;
  if (typeof code === "string") return code;
  return getErrorCodeAtDepth(error.cause, depth + 1);
}

/** Walks `error.code`, then `error.cause.code`, etc. up to a depth guard. */
export function getErrorCode(error: unknown): string | undefined {
  return getErrorCodeAtDepth(error, 0);
}

/** Strips the query string (and everything after `?`) from a path or URL. */
export function stripQuery(pathOrUrl: string): string {
  const idx = pathOrUrl.indexOf("?");
  return idx === -1 ? pathOrUrl : pathOrUrl.slice(0, idx);
}

export interface ApiErrorContext {
  endpoint: string;
  method: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const ABORT_CODES = new Set(["ERR_CANCELED", "ABORT_ERR"]);
const ABORT_NAMES = new Set(["CanceledError", "AbortError"]);
const TIMEOUT_CODES = new Set(["ECONNABORTED", "ETIMEDOUT"]);

function isAborted(err: unknown, ctx: ApiErrorContext): boolean {
  if (ctx.signal?.aborted === true) return true;
  if (!isRecord(err)) return false;

  const code = err.code;
  if (typeof code === "string" && ABORT_CODES.has(code)) return true;

  const name = err.name;
  return typeof name === "string" && ABORT_NAMES.has(name);
}

interface AxiosLikeResponse {
  status: number;
  data?: unknown;
  headers?: Record<string, unknown>;
}

function getResponse(err: unknown): AxiosLikeResponse | undefined {
  if (!isRecord(err)) return undefined;
  const response = err.response;
  if (!isRecord(response)) return undefined;

  const status = response.status;
  if (typeof status !== "number") return undefined;

  return {
    status,
    data: response.data,
    headers: isRecord(response.headers) ? response.headers : undefined,
  };
}

/**
 * Classifies ANY rejection reachable from the client into a concrete
 * `ApiError`. Idempotent: an already-classified `ApiError` is returned
 * as-is. Otherwise, in order: abort, then HTTP response, then
 * timeout-without-response, then any other no-response failure.
 */
export function toApiError(err: unknown, ctx: ApiErrorContext): ApiError {
  if (err instanceof ApiError) return err;

  if (isAborted(err, ctx)) {
    return new RequestAborted({ endpoint: ctx.endpoint, method: ctx.method, cause: err });
  }

  const response = getResponse(err);
  if (response) {
    return new HttpError(response.status, {
      endpoint: ctx.endpoint,
      method: ctx.method,
      cause: err,
      body: response.data,
      retryAfterMs: parseRetryAfterMs(response.headers?.["retry-after"]),
    });
  }

  const code = isRecord(err) ? err.code : undefined;
  if (typeof code === "string" && TIMEOUT_CODES.has(code)) {
    return new TimeoutError({
      endpoint: ctx.endpoint,
      method: ctx.method,
      cause: err,
      timeoutMs: ctx.timeoutMs ?? 30_000,
    });
  }

  return new NetworkError({
    endpoint: ctx.endpoint,
    method: ctx.method,
    cause: err,
    code: getErrorCode(err),
  });
}
