import type { NotebookSpec } from "./notebook-spec";

/**
 * The Filecoin pilot dashboard, as a spec.
 *
 * MIRROR of `FILECOIN_GRANTS_OVERVIEW_SPEC` in gap-indexer
 * (`app/modules/v2/services/notebook-config/notebook-config.fixtures.ts`).
 * The indexer seeds it; this copy exists so the frontend can pin it in a
 * golden test and so the preview demo stub renders the same page the seed
 * produces rather than an approximation of it.
 *
 * WHAT IT IS FOR. This document reproduces, exactly, the hand-written layout
 * the public notebook page shipped with before that layout became
 * spec-driven — the four KPI tiles in order, both bar sections with their
 * headings and descriptions, and the applications block. The golden test in
 * `__tests__/components/notebooks/NotebookOverviewView.golden.test.tsx`
 * asserts that equivalence, which is what lets the render change from a fixed
 * layout to a spec-driven one without anyone having to trust that it looks
 * the same.
 *
 * If a section's title or description changes here, that test fails. That is
 * the intent: the seeded page's appearance is stated once, as data.
 */
export const NOTEBOOK_SEED_SPEC: NotebookSpec = {
  version: 1,
  sections: [
    {
      type: "kpis",
      metrics: ["committed", "disbursed", "fundedProjects", "milestoneCompletion"],
    },
    {
      type: "bars",
      source: "programs",
      metric: "disbursedVsCommitted",
      title: "Disbursed against commitment",
      description:
        "How much of each program's committed funding has actually been paid out. Bars share one scale, so program sizes are comparable.",
    },
    {
      type: "bars",
      source: "tracks",
      metric: "milestoneCompletion",
      title: "Milestone completion by track",
      description: "Average share of milestones completed across the projects in each track.",
    },
    { type: "applications" },
  ],
};
