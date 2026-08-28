/**
 * DEMONSTRATION ONLY — DO NOT MERGE, DO NOT COPY.
 *
 * This component exists purely to make the design gate fire. Every line below
 * is a deliberate violation, paired with the correct version in a comment so
 * the fix is obvious. It is not wired into any route and renders nowhere.
 *
 * See gap-app-v2/CLAUDE.md § "Design system" for the rule table.
 */
import "./showcase.scss";

// DS002 — a raw colour literal in a string.
// Correct: read the palette from tailwind.config.js / the theme tokens,
// e.g. const CHART_SERIES = ["var(--chart-1)", "var(--chart-2)"];
const CHART_SERIES = ["#1f77b4"];

// design-check-ignore
// ^ DS000 — a bare waiver: no rule id and no reason. The correct form is the
//   one used further down: the keyword, a colon, the rule id, then a reason of
//   at least ten characters. (Written out rather than shown literally here,
//   because the checker reads waivers out of comments — including this one.)
const UNUSED_MARKER = CHART_SERIES.length;

export function DesignCheckShowcase() {
  return (
    <section>
      {/* DS001 — arbitrary colour in a Tailwind class.  Correct: bg-brand */}
      <div className="bg-[#2ed1a8]">arbitrary colour</div>

      {/* DS006 (warn) — arbitrary type scale.  Correct: text-sm */}
      <p className="text-[13px]">arbitrary type scale</p>

      {/* DS004 — !important override.  Correct: p-2, and fix the specificity */}
      <div className="!p-2">important override</div>

      {/* DS003 — literal colour and size in an inline style.
          Correct: className="text-zinc-900 text-sm", or
          style={{ color: "var(--fg-default)" }} in a next/og route */}
      <span style={{ color: "#101828", fontSize: "13px" }}>inline style literals</span>

      {/* DS005 — raw interactive primitive.
          Correct: import { Button } from "@/components/ui/button" */}
      <button type="button">raw primitive</button>

      {/* A CORRECT waiver: names the rule and gives a reason of 10+ characters,
          so this finding is reported as waived rather than blocking. It still
          has to be declared under "## Review waivers" in the PR body. */}
      {/* design-check-ignore: DS001 tenant-supplied brand swatch, migration tracked in DEV-999 */}
      <div className="bg-[#654321]">waived arbitrary colour</div>

      <span className="showcase-legacy">{UNUSED_MARKER}</span>
    </section>
  );
}
