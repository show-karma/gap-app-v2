import { NOTEBOOK_SEED_SPEC } from "@/services/notebooks/notebook-seed-spec";
import type { NotebookConfig } from "@/services/notebooks.service";

/**
 * TEMPORARY DEMO SCAFFOLD — DELETE WHEN WS3 DEPLOYS.
 *
 * The notebook page registry lives in gap-indexer behind
 * `/v2/communities/{slug}/notebook-configs`, which is still an unmerged draft
 * (PR #2411), so every environment we can deploy to answers 404 and the page
 * correctly renders not-found. That blocks *seeing* the native dashboard, even
 * though the dashboard itself is finished and its data is real.
 *
 * This module stands in for that one missing row — on a preview deployment, or
 * on a developer's own dev server — so the render is visible while the backend
 * lands. It fabricates NOTHING a reader sees as data: the KPI values, the bars
 * and the applications breakdown are all still fetched live from the GAP API
 * server-side. What is stubbed is only the page's registry entry — its slug,
 * title and description.
 *
 * REMOVAL: delete this file, delete `notebookDemoConfig` from both notebook
 * routes, delete its test. Nothing else references it. The real path is
 * untouched and already works the moment the endpoint exists.
 *
 * ── Why this cannot reach production ─────────────────────────
 *
 * Four independent conditions, all required:
 *
 *  1. The stub may only open in one of exactly two places: a Vercel PREVIEW
 *     deployment (`VERCEL_ENV === "preview"`), or a developer's own machine
 *     running `next dev` (`NODE_ENV === "development"`). A production
 *     deployment is neither, and is additionally vetoed outright by
 *     `VERCEL_ENV === "production"` before anything else is considered — a
 *     value Vercel sets itself, that no flag and no branch can talk past.
 *     `next build` / `next start` set `NODE_ENV=production`, so a deployed
 *     build never satisfies the local clause either.
 *  2. An explicit opt-in. On a preview: `NOTEBOOK_DEMO_STUB=true`, or the
 *     deployment is building this feature branch — the branch clause is what
 *     makes the demo work without provisioning a dashboard variable, and is
 *     impossible on a production deployment, which builds `main`. Locally the
 *     env var is the ONLY way in: there is no branch clause, because
 *     `VERCEL_GIT_COMMIT_REF` does not exist off Vercel, so a branch check
 *     there would be dead code pretending to be a guard.
 *  3. The community and slug match the one demo page exactly.
 *  4. The real registry actually 404'd. A deployed config always wins — this
 *     is a fallback, never an override.
 *
 * Condition 1 alone is sufficient. The rest exist so that if it were ever
 * removed by accident, the blast radius is still one slug on one branch.
 */

/**
 * Indexer the demo reads metrics from.
 *
 * The preview is configured against staging, whose Filecoin data is a thin
 * copy — 85 projects, 58 of 229 milestones, and zero committed or disbursed
 * funding. Rendered faithfully that reads to a viewer as "this dashboard is
 * broken", or worse "Filecoin has funded nothing", rather than as "this is
 * staging". For a demo whose entire job is to show the real programme, the
 * numbers have to be the real ones.
 *
 * Production GAP data is public, read-only and unauthenticated — the same
 * bytes any anonymous visitor to app.karmahq.org already receives — so reading
 * it from a preview grants nothing that was not already public. Only the two
 * notebook metric calls repoint; every other request on the page keeps reading
 * whatever the environment configures.
 */
const DEMO_METRICS_ORIGIN = "https://gapapi.karmahq.xyz";

/**
 * Base URL override for the notebook metric calls, or undefined to leave the
 * client on its configured indexer.
 *
 * TEMPORARY — dies with the rest of this module when WS3 deploys.
 */
export function notebookDemoApiBaseUrl(): string | undefined {
  return isNotebookDemoStubEnabled() ? DEMO_METRICS_ORIGIN : undefined;
}

/** The single branch this demo may build on. */
const DEMO_BRANCH = "feat/notebook-pages";

/** The single page the stub can stand in for. */
const DEMO_COMMUNITY = "filecoin";
const DEMO_SLUG = "grants-overview";

/**
 * Whether the stub may be consulted at all.
 *
 * Exported so a test can assert it stays false for every environment that is
 * neither a preview nor a local dev server — that assertion is the guard, not
 * this comment.
 */
export function isNotebookDemoStubEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  // Veto, checked before anything else: Vercel's own environment marker. It is
  // "production" on a production deployment and Vercel sets it, not us, so no
  // flag and no NODE_ENV can reach past this line there.
  if (env.VERCEL_ENV === "production") return false;

  const flagged = env.NOTEBOOK_DEMO_STUB === "true";

  // Preview: explicit opt-in, or this feature branch.
  if (env.VERCEL_ENV === "preview") {
    return flagged || env.VERCEL_GIT_COMMIT_REF === DEMO_BRANCH;
  }

  // A developer's own `next dev`. The flag is the only way in — no branch
  // clause, because VERCEL_GIT_COMMIT_REF is absent off Vercel. `next build`
  // and `next start` set NODE_ENV=production, so no deployed build lands here.
  if (env.NODE_ENV === "development") return flagged;

  return false;
}

/**
 * The stand-in registry entry, or null.
 *
 * Callers must only reach this after the real lookup returned null, so a
 * deployed config always takes precedence.
 */
export function notebookDemoConfig(communityId: string, slug: string): NotebookConfig | null {
  if (!isNotebookDemoStubEnabled()) return null;
  if (communityId !== DEMO_COMMUNITY || slug !== DEMO_SLUG) return null;

  return demoConfig();
}

/** The demo page as it appears in a community's list. */
export function notebookDemoList(communityId: string): NotebookConfig[] {
  if (!isNotebookDemoStubEnabled()) return [];
  if (communityId !== DEMO_COMMUNITY) return [];

  return [demoConfig()];
}

function demoConfig(): NotebookConfig {
  return {
    id: "demo-grants-overview",
    communityId: DEMO_COMMUNITY,
    slug: DEMO_SLUG,
    name: "Grants & milestones overview",
    description:
      "Committed and disbursed funding, milestone progress by track, and the application funnel — read live from the GAP API.",
    // The same spec the indexer seeds for this page, so the stubbed render and
    // the seeded one are the same render. Imported rather than restated: a
    // second copy here could drift from the seed and quietly make this demo a
    // preview of a page that does not exist.
    spec: NOTEBOOK_SEED_SPEC,
    status: "published",
    createdAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-29T00:00:00.000Z",
  } as NotebookConfig;
}
