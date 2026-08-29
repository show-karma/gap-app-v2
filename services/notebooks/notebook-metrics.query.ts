import "server-only";

import pluralize from "pluralize";
import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import {
  type NotebookCommunityMetricsDto,
  NotebookCommunityMetricsDtoSchema,
  type NotebookCommunityStatsDto,
  NotebookCommunityStatsDtoSchema,
} from "./notebook-metrics.dto";
import type { NotebookBar, NotebookMetrics, NotebookStat } from "./notebook-metrics.types";

const CommunityIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, "invalid community id");

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

function canonicalMilestoneCompletion(stats: NotebookCommunityStatsDto): {
  completed: number;
  total: number;
  percentage: number;
} {
  // This mirrors Community/Header.tsx exactly. The indexer excludes cancelled
  // milestones from totalMilestones, so they are absent from both sides.
  const completed =
    stats.projectUpdatesBreakdown.projectCompletedMilestones +
    stats.projectUpdatesBreakdown.grantCompletedMilestones;
  const total = stats.totalMilestones;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

function requireSingleCurrency(currencies: string[]): string {
  const populated = currencies.filter((currency) => currency.trim().length > 0);
  if (populated.length !== 1) {
    throw new Error(
      `Notebook funding totals require exactly one currency; received ${populated.length}`
    );
  }
  return populated[0].trim();
}

function toNotebookMetrics(
  metrics: NotebookCommunityMetricsDto,
  communityStats: NotebookCommunityStatsDto
): NotebookMetrics {
  const { totals, programs, byTrack } = metrics.funding;
  const currency = requireSingleCurrency(totals.currencies);
  const milestoneCompletion = canonicalMilestoneCompletion(communityStats);

  const stats: NotebookStat[] = [
    { label: "Committed", value: totals.allocated, format: "currency" },
    {
      label: "Disbursed",
      value: totals.disbursed,
      format: "currency",
      hint: `${formatCompact(totals.remaining)} still to pay out`,
    },
    {
      label: "Funded projects",
      // Match the canonical community header. funding.distinctProjects only
      // counts projects represented in Program Financials and is 47 for
      // Filecoin today, while the grants-backed canonical count is 48.
      value: communityStats.totalProjects,
      format: "count",
    },
    {
      label: "Milestone completion",
      value: milestoneCompletion.percentage,
      format: "percent",
      hint: `${milestoneCompletion.completed} of ${milestoneCompletion.total}; cancelled excluded`,
    },
  ];

  // The common total is the largest allocation, not each row's own
  // allocation. This keeps every program on one comparable scale.
  const largestAllocation = Math.max(1, ...programs.map((program) => program.totalAllocated));
  const funding: NotebookBar[] = [...programs]
    .sort((left, right) => right.totalAllocated - left.totalAllocated)
    .map((program) => ({
      label: program.programName,
      value: program.totalDisbursed,
      total: largestAllocation,
      caption: `${formatCompact(program.totalDisbursed)} of ${formatCompact(program.totalAllocated)}`,
      meta: `${program.projectCount} ${pluralize("project", program.projectCount)}`,
    }));

  const completion: NotebookBar[] = byTrack
    .filter(
      (track): track is typeof track & { track: string; avgMilestoneCompletion: number } =>
        track.track !== null && track.avgMilestoneCompletion !== null
    )
    .sort((left, right) => right.avgMilestoneCompletion - left.avgMilestoneCompletion)
    .map((track) => ({
      label: track.track,
      value: track.avgMilestoneCompletion,
      total: 100,
      caption: `${track.avgMilestoneCompletion.toFixed(1)}%`,
      meta: `${track.projects} ${pluralize("project", track.projects)}`,
    }));

  const applications = [
    { label: "Approved", value: metrics.approvedApplications },
    {
      label: "Under review",
      value: metrics.underReviewApplications + metrics.pendingApplications,
    },
    { label: "Not approved", value: metrics.rejectedApplications },
  ].filter((entry) => entry.value > 0);

  return { currency, stats, funding, completion, applications };
}

/**
 * Fetch chart-ready notebook metrics for a community.
 *
 * `/metrics` is authoritative for financial, program, track and application
 * values. `/stats` is authoritative for the grants-backed project count and
 * milestone fraction rendered by the existing community header. Keeping the
 * reconciliation here prevents components and builder configurations from
 * inventing their own aggregation rules.
 */
export async function getNotebookMetrics(communityId: string): Promise<NotebookMetrics> {
  const validatedCommunityId = CommunityIdSchema.parse(communityId);
  const [metrics, communityStats] = await Promise.all([
    api.get<NotebookCommunityMetricsDto>(
      INDEXER.V2.COMMUNITY_PROGRAM_METRICS(validatedCommunityId),
      { schema: NotebookCommunityMetricsDtoSchema, isAuthorized: false }
    ),
    api.get<NotebookCommunityStatsDto>(INDEXER.COMMUNITY.V2.STATS(validatedCommunityId), {
      schema: NotebookCommunityStatsDtoSchema,
      isAuthorized: false,
    }),
  ]);

  return toNotebookMetrics(metrics, communityStats);
}
