/**
 * Project Profile Page Types
 *
 * Domain types for the project profile page components.
 * Follows DDD patterns by centralizing all profile-related types.
 */

import type { UnifiedMilestone } from "./roadmap";

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
export type ActivityFilterType = "funding" | "updates" | "blog" | "socials" | "other";

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
  { value: "updates", label: "Product updates" },
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
  error: Error | null;
}
