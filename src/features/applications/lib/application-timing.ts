/**
 * Measures how long an applicant spent on the form.
 *
 * The clock has to live outside React because the two ends of it are in
 * different places: `ApplicationFormClient` starts it when the form opens, and
 * `useApplicationSubmit` reads it from inside a mutation callback. A module
 * variable is exactly the right scope — it lives as long as the page session,
 * which is the window `time_to_submit_s` is defined over. A submit after a
 * reload, or on a program the visitor did not start here, reports `null` rather
 * than a fabricated duration.
 */

const startedAt = new Map<string, number>();

/** Called when the applicant is first shown the form for `programId`. */
export const markApplicationStarted = (programId: string): void => {
  startedAt.set(programId, Date.now());
};

/** Seconds since the form opened, or `null` when this page session never saw it. */
export const secondsSinceApplicationStarted = (programId: string): number | null => {
  const start = startedAt.get(programId);
  if (start === undefined) return null;
  return Math.round((Date.now() - start) / 1000);
};

/** Test-only: forget every recorded start between cases. */
export const __resetApplicationTimingForTests = (): void => {
  startedAt.clear();
};
