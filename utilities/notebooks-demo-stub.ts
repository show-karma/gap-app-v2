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
 * This module stands in for that one missing row, on preview only, so the
 * render is visible while the backend lands. It fabricates NOTHING a reader
 * sees as data: the KPI values, the bars and the applications breakdown are all
 * still fetched live from the GAP API server-side. What is stubbed is only the
 * page's registry entry — its slug, title and description.
 *
 * REMOVAL: delete this file, delete `notebookDemoConfig` from both notebook
 * routes, delete its test. Nothing else references it. The real path is
 * untouched and already works the moment the endpoint exists.
 *
 * ── Why this cannot reach production ─────────────────────────
 *
 * Four independent conditions, all required:
 *
 *  1. `VERCEL_ENV === "preview"`. Vercel sets this itself and it is
 *     `"production"` on a production deployment, so no flag, no branch and no
 *     mistake in the code below can switch this on in production.
 *  2. An explicit opt-in: either `NOTEBOOK_DEMO_STUB=true`, or the deployment
 *     is building this feature branch. The branch clause is what makes the
 *     demo work today without provisioning a dashboard variable; it is also
 *     impossible on a production deployment, which builds `main`.
 *  3. The community and slug match the one demo page exactly.
 *  4. The real registry actually 404'd. A deployed config always wins — this
 *     is a fallback, never an override.
 *
 * Condition 1 alone is sufficient. The rest exist so that if it were ever
 * removed by accident, the blast radius is still one slug on one branch.
 */

/** The single branch this demo may build on. */
const DEMO_BRANCH = "feat/notebook-pages";

/** The single page the stub can stand in for. */
const DEMO_COMMUNITY = "filecoin";
const DEMO_SLUG = "grants-overview";

/**
 * Whether the stub may be consulted at all.
 *
 * Exported so a test can assert it stays false for every environment that is
 * not a preview — that assertion is the guard, not this comment.
 */
export function isNotebookDemoStubEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  // Gate 1: Vercel's own environment marker. Never "preview" in production.
  if (env.VERCEL_ENV !== "preview") return false;

  // Gate 2: explicit opt-in, or this feature branch.
  const flagged = env.NOTEBOOK_DEMO_STUB === "true";
  const onDemoBranch = env.VERCEL_GIT_COMMIT_REF === DEMO_BRANCH;
  return flagged || onDemoBranch;
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
    // Vestigial under the native render; the model still requires them and the
    // page never uses either for anything a reader sees.
    artifactUrl: "https://gapapi.karmahq.xyz/v2/communities/filecoin/metrics",
    artifactVersion: "preview-demo",
    status: "published",
    createdAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-29T00:00:00.000Z",
  } as NotebookConfig;
}
