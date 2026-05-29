import type { ResultAsync } from "neverthrow";
import type { AppError } from "./errors";

/**
 * Unwrap a `ResultAsync<T, AppError>` into a plain `Promise<T>`.
 *
 * On success the resolved value is returned as-is.
 * On failure the `AppError` is thrown so React Query's `queryFn` contract is
 * satisfied — React Query treats thrown values as errors and populates
 * `query.error`.
 *
 * Usage:
 * ```ts
 * const { data } = useQuery({
 *   queryKey: ['foundation', id],
 *   queryFn: () => resultToPromise(philanthropyService.getFoundation(id)),
 * });
 * ```
 */
export function resultToPromise<T>(r: ResultAsync<T, AppError>): Promise<T> {
  return r.match(
    (data) => data,
    (err) => {
      throw err;
    }
  );
}
