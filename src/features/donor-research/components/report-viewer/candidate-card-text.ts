/**
 * Text helpers specific to the candidate card.
 *
 * Most normalization helpers (`humanizeCase`, `formatEin`, `hostname`,
 * `truncate`) are shared with the brief view and live in
 * `../report-brief/text-utils`. The card keeps its own `formatLocale`
 * here because it renders the raw city string rather than humanizing it
 * the way the brief does — swapping to the shared version would change
 * the rendered output.
 */

export function formatLocale(city: string | null, state: string | null): string | null {
  if (city && state) return `${city}, ${state}`;
  return city ?? state ?? null;
}
