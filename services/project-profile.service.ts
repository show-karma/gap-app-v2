/**
 * Project Profile Service
 *
 * Service layer for project profile data transformation and aggregation.
 * Follows DDD patterns by separating business logic from components.
 */

import type { Grant } from "@/types/v2/grant";
import type { Project } from "@/types/v2/project";
import type {
  ActivityFilterType,
  ProjectProfileData,
  ProjectProfileStats,
  SortOption,
} from "@/types/v2/project-profile.types";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import type { ProjectImpact } from "./project-impacts.service";

// =============================================================================
// Data Transformation Functions
// =============================================================================

/**
 * Transforms project impacts into unified milestone format for activity feed.
 *
 * @param impacts - Array of project impacts from the API
 * @returns Array of UnifiedMilestone items
 */
export function transformImpactsToMilestones(impacts: ProjectImpact[]): UnifiedMilestone[] {
  return impacts.map((impact) => ({
    uid: impact.uid,
    type: "impact" as const,
    title: impact.data?.work || "Impact",
    description: impact.data?.impact,
    createdAt: impact.createdAt || new Date().toISOString(),
    completed: false,
    chainID: impact.chainID,
    refUID: impact.refUID,
    source: { type: "impact" },
  }));
}

/**
 * Transforms grants into unified milestone format for "Grant Received" timeline items.
 *
 * @param grants - Array of grants from the API
 * @returns Array of UnifiedMilestone items with type "grant_received"
 */
export function transformGrantsToMilestones(grants: Grant[]): UnifiedMilestone[] {
  return grants.map((grant) => {
    // Get amount - may already include currency (e.g., "80000 USDC")
    const rawAmount = grant.details?.amount || grant.amount;
    const currency = grant.details?.currency;

    // Only append currency if rawAmount doesn't already contain it
    const amountHasCurrency = rawAmount && currency && rawAmount.includes(currency);
    const amount =
      rawAmount && currency && !amountHasCurrency ? `${rawAmount} ${currency}` : rawAmount;

    return {
      uid: `grant-received-${grant.uid}`,
      type: "grant_received" as const,
      title: grant.details?.title || "Grant Received",
      description: grant.details?.description,
      createdAt: grant.createdAt || new Date().toISOString(),
      completed: false,
      chainID: grant.chainID,
      refUID: grant.uid,
      source: { type: "grant_received" },
      grantReceived: {
        amount,
        currency,
        communityName: grant.community?.details?.name,
        communitySlug: grant.community?.details?.slug,
        communityImage: grant.community?.details?.imageURL,
        grantTitle: grant.details?.title,
        grantUID: grant.uid,
      },
    };
  });
}

/**
 * Combines milestones, impacts, and grants into a unified activity list.
 *
 * @param milestones - Array of milestones from useProjectUpdates
 * @param impacts - Array of impacts from useProjectImpacts
 * @param grants - Optional array of grants for "Grant Received" items
 * @returns Combined array of UnifiedMilestone items
 */
export function combineUpdatesAndImpacts(
  milestones: UnifiedMilestone[],
  impacts: ProjectImpact[],
  grants: Grant[] = []
): UnifiedMilestone[] {
  const impactItems = transformImpactsToMilestones(impacts);
  const grantItems = transformGrantsToMilestones(grants);
  return [...milestones, ...impactItems, ...grantItems];
}

/**
 * Counts completed milestones in the activity list.
 *
 * @param updates - Array of unified milestones
 * @returns Number of completed items
 */
export function countCompletedMilestones(updates: UnifiedMilestone[]): number {
  return updates.filter((m) => m.completed).length;
}

/**
 * Determines if a project is verified based on available data.
 * Currently uses grant count as verification indicator.
 *
 * @param grants - Array of project grants
 * @returns Boolean indicating verification status
 */
export function determineProjectVerification(grants: Grant[]): boolean {
  return grants.length > 0;
}

/**
 * Calculates project profile statistics.
 *
 * @param project - The project data
 * @param grants - Array of project grants
 * @param updates - Array of unified milestones
 * @returns ProjectProfileStats object
 */
export function calculateProfileStats(
  project: Project | null,
  grants: Grant[],
  updates: UnifiedMilestone[]
): ProjectProfileStats {
  const endorsementsCount = project?.endorsements?.length || 0;
  const grantsCount = grants.length;
  const lastUpdate = updates.length > 0 ? new Date(updates[0].createdAt) : undefined;

  // Calculate completion rate
  const totalMilestones = updates.length;
  const completedMilestones = countCompletedMilestones(updates);
  const completeRate =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : undefined;

  return {
    grantsCount,
    endorsementsCount,
    lastUpdate,
    completeRate,
  };
}

/**
 * Aggregates all project profile data from multiple sources.
 *
 * @param project - The project data
 * @param grants - Array of project grants
 * @param milestones - Array of milestones from useProjectUpdates
 * @param impacts - Array of impacts from useProjectImpacts
 * @returns Complete ProjectProfileData object
 */
export function aggregateProjectProfileData(
  project: Project | null,
  grants: Grant[],
  milestones: UnifiedMilestone[],
  impacts: ProjectImpact[]
): ProjectProfileData {
  const allUpdates = combineUpdatesAndImpacts(milestones, impacts, grants);
  const completedCount = countCompletedMilestones(allUpdates);
  const isVerified = determineProjectVerification(grants);
  const stats = calculateProfileStats(project, grants, allUpdates);

  return {
    isVerified,
    allUpdates,
    completedCount,
    stats,
  };
}

// =============================================================================
// Activity Feed Filtering & Sorting
// =============================================================================

/**
 * Sorts activity items by date.
 *
 * @param items - Array of unified milestones
 * @param sortOption - Sort direction (newest/oldest)
 * @returns Sorted array
 */
export function sortActivities(
  items: UnifiedMilestone[],
  sortOption: SortOption
): UnifiedMilestone[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOption === "newest" ? dateB - dateA : dateA - dateB;
  });
}

/**
 * Maps milestone type to activity filter type for filtering.
 *
 * @param milestone - UnifiedMilestone item
 * @returns Corresponding ActivityFilterType
 */
export function getActivityFilterType(milestone: UnifiedMilestone): ActivityFilterType {
  switch (milestone.type) {
    case "grant":
    case "grant_update":
    case "grant_received":
      return "funding";
    case "project":
    case "milestone":
    case "update":
    case "activity":
      return "updates";
    case "impact":
      return "other";
    default:
      return "other";
  }
}

/**
 * Filters activities by selected filter types.
 *
 * @param items - Array of unified milestones
 * @param activeFilters - Array of active filter types
 * @returns Filtered array (returns all if no filters active)
 */
export function filterActivities(
  items: UnifiedMilestone[],
  activeFilters: ActivityFilterType[]
): UnifiedMilestone[] {
  if (activeFilters.length === 0) {
    return items;
  }

  return items.filter((item) => {
    const filterType = getActivityFilterType(item);
    return activeFilters.includes(filterType);
  });
}

/**
 * Applies both sorting and filtering to activity items.
 *
 * @param items - Array of unified milestones
 * @param sortOption - Sort direction
 * @param activeFilters - Active filter types
 * @returns Sorted and filtered array
 */
export function processActivities(
  items: UnifiedMilestone[],
  sortOption: SortOption,
  activeFilters: ActivityFilterType[]
): UnifiedMilestone[] {
  const filtered = filterActivities(items, activeFilters);
  return sortActivities(filtered, sortOption);
}
