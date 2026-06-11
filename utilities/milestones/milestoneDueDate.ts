import { normalizeTimestamp } from "@/utilities/formatDate";

/**
 * Earliest timestamp a milestone due date is allowed to resolve to.
 *
 * Anything resolving before 2000-01-01 UTC is treated as corrupted attestation
 * data (e.g. a 1970-era value produced by interpreting Unix seconds as
 * milliseconds) and degraded to "no due date" rather than rendered as a real
 * past-due date. The Karma platform and the underlying EAS attestations postdate
 * this floor, so a genuine due date can never legitimately precede it.
 */
export const MIN_VALID_DUE_DATE_MS = Date.UTC(2000, 0, 1);

export type MilestoneDueDateInput = number | string | Date | null | undefined;

/**
 * Canonical milestone due-date normalizer — the single source of truth for what
 * counts as a valid due date across every milestone surface.
 *
 * - `number`: disambiguated between Unix seconds and milliseconds via
 *   {@link normalizeTimestamp}'s digit-count heuristic, so the same field can be
 *   fed regardless of which denomination a given pipeline produced.
 * - `string`: parsed as a date (ISO or any `Date`-parseable string).
 * - `Date`: read directly.
 * - `null` / `undefined` / `0` / `NaN` / unparseable / pre-2000 values: rejected.
 *
 * @returns the due date in epoch milliseconds, or `null` when the input does not
 * represent a valid due date.
 */
export function normalizeMilestoneDueDateMs(input: MilestoneDueDateInput): number | null {
  if (input == null) return null;

  let ms: number;
  if (input instanceof Date) {
    ms = input.getTime();
  } else if (typeof input === "number") {
    if (!Number.isFinite(input) || input <= 0) return null;
    ms = normalizeTimestamp(input);
  } else {
    ms = new Date(input).getTime();
  }

  if (Number.isNaN(ms) || ms < MIN_VALID_DUE_DATE_MS) return null;
  return ms;
}
