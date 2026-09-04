import * as Sentry from "@sentry/nextjs";
import { unstable_cache } from "next/cache";
import { getNotebookMetrics } from "./notebooks/notebook-metrics.query";
import type { NotebookMetrics } from "./notebooks/notebook-metrics.types";

/**
 * Data behind a notebook page's static-first render (Architecture B).
 *
 * The whole point of B is that a viewer pays for none of this: the numbers are
 * computed once per revalidation window and served as already-rendered HTML,
 * instead of every visitor booting a Python runtime to recompute them.
 *
 * FRESHNESS. The route itself cannot be a true ISR page in this app — the root
 * layout awaits `headers()` for whitelabel detection, which makes every route
 * render dynamically. So the revalidation window lives on the DATA instead:
 * `unstable_cache` holds this payload for {@link NOTEBOOK_REVALIDATE_SECONDS}
 * and is tagged, so `/api/notebooks/revalidate` can invalidate it the moment
 * the indexer ingests new grants. The effect a reader sees is the same — a
 * bounded, tunable staleness window with an on-demand escape hatch — and the
 * request path costs a cache read rather than an upstream round trip.
 *
 * BOUNDARY. The queries and their reconciliation belong to WS-C1
 * (`services/notebooks/`); this module owns only the freshness layer — the
 * cache window, the tag, FR5 retention, and the three provenance fields a
 * chart-ready result cannot know about itself.
 */

/** One hour. Grants data moves slowly; on-demand revalidation covers the rest. */
export const NOTEBOOK_REVALIDATE_SECONDS = 3600;

/**
 * Shape version of the cached payload. BUMP IT whenever {@link NotebookOverview}
 * or anything it embeds changes shape.
 *
 * It is part of the cache key, so a deploy that changes the payload's shape
 * misses every entry written by the previous one instead of reading it back
 * and rendering against a shape that no longer exists. Without this, adding
 * `id` to a stat made the KPI tiles silently render EMPTY for a full
 * revalidation window — the page looked healthy, and the numbers were simply
 * gone. A tag revalidation would eventually have fixed it, which is precisely
 * what makes the failure easy to miss.
 */
const OVERVIEW_SHAPE_VERSION = "v2-stat-ids";

/** Cache tag for one community's notebook data. */
export function notebookOverviewTag(communityId: string): string {
  return `notebook-overview:${communityId.toLowerCase()}`;
}

// ── View model ───────────────────────────────────────────────
// The chart-ready shape is WS-C1's contract; this module adds only the three
// fields that the cache layer alone can know.

export type { NotebookBar, NotebookStat } from "./notebooks/notebook-metrics.types";

export interface NotebookOverview extends NotebookMetrics {
  /** Where the numbers came from — surfaced to the reader, not decoration. */
  source: "gap-api" | "snapshot";
  /**
   * True when a refresh failed and this is the last payload that succeeded
   * (FR5). The page still renders; the reader is told the figures are older
   * than the window claims rather than shown a blank or an error.
   */
  stale: boolean;
  /** When this payload was computed (ISO). */
  generatedAt: string;
}

// ── Loading ──────────────────────────────────────────────────

async function fetchOverview(communityId: string): Promise<NotebookOverview> {
  // WS-C1 owns the queries and the reconciliation behind them: the milestone
  // figure is the canonical fraction from /stats, not the unweighted mean
  // /metrics reports, so this page agrees with HeaderStatsCards rather than
  // quietly disagreeing by a couple of points.
  const metrics = await getNotebookMetrics(communityId);
  return {
    ...metrics,
    source: "gap-api",
    stale: false,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Last payload that loaded successfully, per community (FR5).
 *
 * A refresh that fails must not blank a page that was working a minute ago:
 * the upstream being briefly unavailable is not a reason to stop showing
 * numbers that were correct as of the timestamp already on the page.
 *
 * Deliberately in-process, and therefore best-effort: it is per server
 * instance and does not survive a cold start. It covers the case that actually
 * happens — a transient upstream failure on a warm instance — and nothing more.
 * Durable last-good is a stored snapshot, which is WS-B1/WS-B3 territory; when
 * that lands it becomes the real floor and this stays as the inner guard.
 */
const lastGoodOverview = new Map<string, NotebookOverview>();

/** For tests: the retention above is module state and must be resettable. */
export function __resetLastGoodOverview(): void {
  lastGoodOverview.clear();
}

async function loadOverview(communityId: string): Promise<NotebookOverview> {
  const key = communityId.toLowerCase();
  try {
    const overview = await fetchOverview(communityId);
    lastGoodOverview.set(key, overview);
    return overview;
  } catch (error) {
    const lastGood = lastGoodOverview.get(key);
    // Nothing to fall back to — a first load that fails has no numbers to show,
    // so the route's error boundary is the honest outcome.
    if (!lastGood) throw error;

    reportOverviewRefreshFailure(communityId, error);
    return { ...lastGood, stale: true };
  }
}

/**
 * A served-stale page looks healthy to a reader, so the failure behind it has
 * to be visible somewhere. Without this, the upstream could be down for hours
 * while every page quietly served yesterday's numbers.
 */
function reportOverviewRefreshFailure(communityId: string, error: unknown): void {
  Sentry.captureException(error, {
    tags: { feature: "notebooks", stage: "overview-refresh" },
    extra: { communityId },
  });
}

/**
 * Cached overview for a community.
 *
 * The cache key includes the community so one tenant's revalidation cannot
 * serve another tenant's numbers, and the tag is per-community for the same
 * reason — an ingest for Filecoin must not invalidate every other page.
 */
export function getNotebookOverview(communityId: string): Promise<NotebookOverview> {
  return unstable_cache(
    () => loadOverview(communityId),
    ["notebook-overview", OVERVIEW_SHAPE_VERSION, communityId.toLowerCase()],
    { revalidate: NOTEBOOK_REVALIDATE_SECONDS, tags: [notebookOverviewTag(communityId)] }
  )();
}
