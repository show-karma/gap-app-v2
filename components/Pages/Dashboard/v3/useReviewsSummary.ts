import { useQueries } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useMemo } from "react";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import type { DashboardAdminCommunity } from "@/hooks/useDashboardAdmin";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { getReviewerInbox } from "@/services/reviewerInboxService";
import type { ModuleStatus, ModuleSummary, TileRow } from "./primitives";
import { deriveReviewerCommunities } from "./reviewCommunities";

// Fetch only the header stats: they're community-wide regardless of page size,
// so `limit: 1` keeps the item payload minimal.
const STATS_ONLY_FILTERS = { limit: 1 } as const;

export interface ReviewsSummaryResult {
  status: ModuleStatus;
  summary?: ModuleSummary;
}

/**
 * Builds the "My reviews" tile summary from the *actionable* count the reviewer
 * inbox actually shows — its server-decided "action" bucket ("Waiting on you") —
 * fetched per community, rather than a metrics approximation that overcounts.
 * So the tile's "N to review" agrees with what the drill-in inbox lists.
 */
export function useReviewsSummary(
  programs: FundingProgram[],
  adminCommunities: DashboardAdminCommunity[],
  enabled: boolean
): ReviewsSummaryResult {
  const communities = useMemo(
    () => deriveReviewerCommunities(programs, adminCommunities),
    [programs, adminCommunities]
  );

  const queries = useQueries({
    queries: communities.map((c) => ({
      queryKey: QUERY_KEYS.reviewerInbox(c.id, STATS_ONLY_FILTERS),
      queryFn: () => getReviewerInbox(c.id, STATS_ONLY_FILTERS),
      enabled,
      staleTime: 1000 * 60 * 2,
    })),
  });

  if (communities.length === 0) return { status: "empty" };
  if (queries.some((q) => q.isLoading)) return { status: "loading" };
  if (queries.length > 0 && queries.every((q) => q.isError)) return { status: "error" };

  const perCommunity = communities.map((c, i) => ({
    name: c.community.details.name || c.id,
    action: queries[i]?.data?.stats?.action ?? 0,
  }));

  const withWork = perCommunity.filter((c) => c.action > 0);
  const totalAction = withWork.reduce((sum, c) => sum + c.action, 0);

  const rows: TileRow[] = [...withWork]
    .sort((a, b) => b.action - a.action)
    .slice(0, 3)
    .map((c) => ({
      icon: Eye,
      label: c.name,
      badge: { tone: "amber", label: `${c.action} to review` },
    }));

  return { status: "ready", summary: { big: totalAction, rows } };
}
