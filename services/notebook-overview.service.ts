import * as Sentry from "@sentry/nextjs";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

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
 * B1 SEAM. When WS-B1's executed snapshot lands, it is read HERE, behind the
 * same cache and the same tag, and this API-derived view model becomes the
 * fallback for a community whose snapshot has not been published yet. Nothing
 * above this module needs to change: the page consumes the view model, not the
 * source.
 */

/** One hour. Grants data moves slowly; on-demand revalidation covers the rest. */
export const NOTEBOOK_REVALIDATE_SECONDS = 3600;

/** Cache tag for one community's notebook data. */
export function notebookOverviewTag(communityId: string): string {
  return `notebook-overview:${communityId.toLowerCase()}`;
}

// ── Wire schema ──────────────────────────────────────────────
// `passthrough()` throughout: the metrics endpoint is shared with other
// consumers and gains fields; a new one must not break a published page.

const ProgramFundingSchema = z
  .object({
    programId: z.string(),
    programName: z.string(),
    primaryCurrency: z.string(),
    totalAllocated: z.number(),
    totalDisbursed: z.number(),
    totalRemaining: z.number(),
    projectCount: z.number(),
    avgMilestoneCompletion: z.number(),
  })
  .passthrough();

const TrackFundingSchema = z
  .object({
    trackId: z.string().nullable(),
    track: z.string().nullable(),
    allocated: z.number(),
    disbursed: z.number(),
    projects: z.number(),
    avgMilestoneCompletion: z.number(),
  })
  .passthrough();

const FundingTotalsSchema = z
  .object({
    allocated: z.number(),
    disbursed: z.number(),
    remaining: z.number(),
    programs: z.number(),
    distinctProjects: z.number(),
    avgMilestoneCompletion: z.number(),
    currencies: z.array(z.string()),
  })
  .passthrough();

const CommunityMetricsSchema = z
  .object({
    communityUID: z.string(),
    totalPrograms: z.number(),
    enabledPrograms: z.number(),
    totalApplications: z.number(),
    approvedApplications: z.number(),
    rejectedApplications: z.number(),
    pendingApplications: z.number(),
    underReviewApplications: z.number(),
    funding: z
      .object({
        programs: z.array(ProgramFundingSchema),
        byTrack: z.array(TrackFundingSchema),
        totals: FundingTotalsSchema,
      })
      .passthrough(),
  })
  .passthrough();

export type CommunityMetrics = z.infer<typeof CommunityMetricsSchema>;

// ── View model ───────────────────────────────────────────────

export interface NotebookStat {
  label: string;
  value: number;
  /** How to render it — the component owns formatting, not this module. */
  format: "currency" | "count" | "percent";
  hint?: string;
}

export interface NotebookBar {
  label: string;
  /** Filled portion. */
  value: number;
  /** Bar total; `value / total` is the filled fraction. */
  total: number;
  /** Right-aligned caption, e.g. "$563K of $614K". */
  caption: string;
  /** Secondary line under the label. */
  meta?: string;
}

export interface NotebookOverview {
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
  currency: string;
  stats: NotebookStat[];
  funding: NotebookBar[];
  completion: NotebookBar[];
  applications: { label: string; value: number }[];
}

// ── Mapping ──────────────────────────────────────────────────

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

/**
 * Metrics → view model.
 *
 * Exported for tests: the mapping is where the reader-facing meaning is
 * decided (what counts as "committed", how a bar is scaled), so it is worth
 * testing without a network.
 */
export function toOverview(metrics: CommunityMetrics, generatedAt: string): NotebookOverview {
  const { totals, programs, byTrack } = metrics.funding;
  const currency = totals.currencies[0] ?? "";

  const stats: NotebookStat[] = [
    { label: "Committed", value: totals.allocated, format: "currency" },
    {
      label: "Disbursed",
      value: totals.disbursed,
      format: "currency",
      hint: `${formatCompact(totals.remaining)} still to pay out`,
    },
    { label: "Funded projects", value: totals.distinctProjects, format: "count" },
    {
      label: "Milestone completion",
      value: totals.avgMilestoneCompletion,
      format: "percent",
      hint: `across ${totals.programs} programs`,
    },
  ];

  // Every bar is scaled against the LARGEST allocation, not against its own
  // total, so bar lengths are comparable between programs — a program with a
  // small budget must not look as large as one with a big budget.
  const largestAllocation = Math.max(1, ...programs.map((program) => program.totalAllocated));

  const funding: NotebookBar[] = [...programs]
    .sort((a, b) => b.totalAllocated - a.totalAllocated)
    .map((program) => ({
      label: program.programName,
      value: program.totalDisbursed,
      total: largestAllocation,
      caption: `${formatCompact(program.totalDisbursed)} of ${formatCompact(program.totalAllocated)}`,
      meta: `${program.projectCount} ${program.projectCount === 1 ? "project" : "projects"}`,
    }));

  // A track row with no track name is the ungrouped remainder, not a track.
  const completion: NotebookBar[] = byTrack
    .filter((track) => track.track !== null)
    .sort((a, b) => b.avgMilestoneCompletion - a.avgMilestoneCompletion)
    .map((track) => ({
      label: track.track as string,
      value: track.avgMilestoneCompletion,
      total: 100,
      caption: `${track.avgMilestoneCompletion.toFixed(1)}%`,
      meta: `${track.projects} ${track.projects === 1 ? "project" : "projects"}`,
    }));

  const applications = [
    { label: "Approved", value: metrics.approvedApplications },
    { label: "Under review", value: metrics.underReviewApplications + metrics.pendingApplications },
    { label: "Not approved", value: metrics.rejectedApplications },
  ].filter((entry) => entry.value > 0);

  return {
    source: "gap-api",
    stale: false,
    generatedAt,
    currency,
    stats,
    funding,
    completion,
    applications,
  };
}

async function fetchOverview(communityId: string): Promise<NotebookOverview> {
  const metrics = await api.get<CommunityMetrics>(
    INDEXER.V2.COMMUNITY_PROGRAM_METRICS(communityId),
    { schema: CommunityMetricsSchema, isAuthorized: false }
  );
  return toOverview(metrics, new Date().toISOString());
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
    ["notebook-overview", communityId.toLowerCase()],
    { revalidate: NOTEBOOK_REVALIDATE_SECONDS, tags: [notebookOverviewTag(communityId)] }
  )();
}
