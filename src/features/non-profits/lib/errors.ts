/**
 * Discriminated union of all application-level errors for the non-profits feature.
 * Used as the `E` type parameter in `ResultAsync<T, AppError>` throughout the
 * feature's service and hook layers.
 */

export type NetworkError = { type: "NetworkError"; message: string };
export type ApiError = { type: "ApiError"; status: number; message: string };
export type ValidationError = { type: "ValidationError"; message: string; cause: unknown };
export type AbortError = { type: "AbortError" };
export type StreamError = { type: "StreamError"; message: string };

export type AppError = NetworkError | ApiError | ValidationError | AbortError | StreamError;

// ── Type guards ──────────────────────────────────────────────────────────────

export function isNetworkError(e: AppError): e is NetworkError {
  return e.type === "NetworkError";
}

export function isApiError(e: AppError): e is ApiError {
  return e.type === "ApiError";
}

export function isValidationError(e: AppError): e is ValidationError {
  return e.type === "ValidationError";
}

export function isAbortError(e: AppError): e is AbortError {
  return e.type === "AbortError";
}

export function isStreamError(e: AppError): e is StreamError {
  return e.type === "StreamError";
}
