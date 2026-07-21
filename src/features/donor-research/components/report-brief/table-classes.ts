/**
 * Shared Tailwind class constants for the report brief's data-table idiom.
 *
 * `FinancialsTable`, `ComparisonTable`, and `ScoreBreakdownTable` render
 * three different markup shapes (a plain `<table>`, a scrollable comparison
 * grid, and a `<dl>`), but MUST still read as one consistent data-table
 * language: a small muted-uppercase caption, sf-line hairline borders, and
 * `font-mono tabular-nums` figures. Centralizing the class strings here
 * keeps the three in lockstep instead of hand-duplicating (and silently
 * drifting) the same Tailwind utilities in each file.
 */

/** Small caption above a table, e.g. "Financials (last 3 years)". */
export const TABLE_CAPTION = "text-[10.5px] font-[650] uppercase tracking-[0.14em] text-sf-muted";

/** Spacing between the caption and the table body. */
export const TABLE_WRAP = "mt-2.5";

/** Header row — hairline top+bottom rule. */
export const TABLE_HEAD_ROW = "border-y border-sf-line";

/** Header cell label. */
export const TABLE_HEAD_CELL = "text-[10px] font-[650] uppercase tracking-[0.1em] text-sf-muted";

/** Body row — hairline bottom rule, no rule after the last row. */
export const TABLE_BODY_ROW = "border-b border-sf-line last:border-b-0";

/** Body cell holding a numeric/monospace figure. */
export const TABLE_CELL_MONO = "font-mono tabular-nums text-sf-ink";

/** Emphasized figure (e.g. composite score, totals). */
export const TABLE_CELL_EMPHASIS = "font-mono font-[650] tabular-nums text-sf-heading";
