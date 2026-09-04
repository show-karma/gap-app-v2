import type { MaturityStageOptions, SortByOptions } from "@/types";

/** Everything the URL decides about which projects the hub grid shows. */
export interface CommunityProjectFilters {
  categories: string[];
  sortBy: SortByOptions;
  maturityStage: MaturityStageOptions;
  programId: string | null;
  trackIds: string[] | null;
  /** `?page=` — the page the grid starts from. 1 when absent. */
  page: number;
}

const sameStringList = (a: readonly string[] | null, b: readonly string[] | null) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((value, index) => value === b[index]));

/**
 * Value equality for a filter set.
 *
 * Lives here rather than in `CommunityGrantsToolbar` because the grid is its
 * other caller: the toolbar publishes filters up, and the grid uses this to
 * swallow the mount update when the URL says nothing new. A module that exports
 * both a component and a helper also loses Fast Refresh for the whole file.
 */
export const sameCommunityProjectFilters = (
  a: CommunityProjectFilters,
  b: CommunityProjectFilters
) =>
  a.sortBy === b.sortBy &&
  a.maturityStage === b.maturityStage &&
  a.programId === b.programId &&
  a.page === b.page &&
  sameStringList(a.categories, b.categories) &&
  sameStringList(a.trackIds, b.trackIds);
