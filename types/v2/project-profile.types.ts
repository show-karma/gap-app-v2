/**
 * Project Profile Page Types
 *
 * Domain types for the project profile page components.
 * Follows DDD patterns by centralizing all profile-related types.
 */

import type { UnifiedMilestone } from "./roadmap";

// =============================================================================
// Updates Feed Filter Types
// =============================================================================

/**
 * Date range filter for the updates feed.
 * Values are ISO 8601 strings (e.g., "2024-01-01" or full datetime).
 */
export interface DateRangeFilter {
  dateFrom?: string;
  dateTo?: string;
}

/**
 * AI evaluation filter for the updates feed.
 * - `hasAIEvaluation`: when true, restricts results to items with an AI evaluation.
 *   Never set to false together with `aiScoreMin`/`aiScoreMax` — omit `hasAIEvaluation` instead.
 * - `aiScoreMin`: integer 0–10; lower bound of the score range filter.
 * - `aiScoreMax`: integer 0–10; upper bound of the score range filter.
 *   If `aiScoreMin > aiScoreMax`, the service swaps them defensively before sending.
 */
export interface AIEvaluationFilter {
  hasAIEvaluation?: boolean;
  aiScoreMin?: number;
  aiScoreMax?: number;
}

/**
 * Combined extra filter params forwarded to the indexer for the updates feed.
 * All fields are optional; undefined/null values are omitted from the query string.
 */
export interface UpdatesFeedFilters extends DateRangeFilter, AIEvaluationFilter {}

// =============================================================================
// Activity Feed Types
// =============================================================================

/**
 * Sort options for the activity feed.
 */
export type SortOption = "newest" | "oldest";

/**
 * Filter types for activity feed categorization.
 */
export type ActivityFilterType =
  | "funding"
  | "milestones"
  | "updates"
  | "endorsements"
  | "blog"
  | "socials"
  | "other";

/**
 * Activity filter option for UI display.
 */
export interface ActivityFilterOption {
  value: ActivityFilterType;
  label: string;
}

/**
 * Default filter options for the activity feed.
 */
export const ACTIVITY_FILTER_OPTIONS: ActivityFilterOption[] = [
  { value: "funding", label: "Funding" },
  { value: "milestones", label: "Milestones" },
  { value: "updates", label: "Updates" },
  { value: "endorsements", label: "Endorsements" },
  { value: "blog", label: "Blog" },
  { value: "socials", label: "Socials" },
  { value: "other", label: "Other" },
] as const;

// =============================================================================
// Content Tab Types
// =============================================================================

/**
 * Tab options for the main content area.
 */
export type ContentTab = "roadmap" | "reviews";

/**
 * Content tab configuration for UI display.
 */
export interface ContentTabOption {
  id: ContentTab;
  label: string;
}

/**
 * Default tab options for the content area.
 */
export const CONTENT_TAB_OPTIONS: ContentTabOption[] = [
  { id: "roadmap", label: "Roadmap" },
  { id: "reviews", label: "Reviews" },
] as const;

// =============================================================================
// Project Profile Stats Types
// =============================================================================

/**
 * Statistics for the project profile stats bar.
 */
export interface ProjectProfileStats {
  grantsCount: number;
  endorsementsCount: number;
  lastUpdate?: Date;
  completeRate?: number;
}

// =============================================================================
// Project Profile Data Types
// =============================================================================

/**
 * Aggregated project profile data returned by useProjectProfile hook.
 * Encapsulates all data needed for the project profile page.
 */
export interface ProjectProfileData {
  /** Whether the project has grants (verification indicator) */
  isVerified: boolean;
  /** All unified updates and milestones for activity feed */
  allUpdates: UnifiedMilestone[];
  /** Count of actual milestones (project + grant milestones only) */
  milestonesCount: number;
  /** Count of completed milestones (project + grant milestones only) */
  completedCount: number;
  /** Statistics for the stats bar */
  stats: ProjectProfileStats;
}

/**
 * Loading and error state for project profile data.
 */
export interface ProjectProfileState {
  isLoading: boolean;
  isProjectLoading: boolean;
  isSecondaryLoading: boolean;
  error: Error | null;
}
