import type {
  CommunityUpdatesSortBy,
  CommunityUpdatesSortOrder,
} from "@/services/community-project-updates.service";

interface SortState {
  sortBy: CommunityUpdatesSortBy;
  sortOrder: CommunityUpdatesSortOrder;
}

/**
 * Computes the next server-side sort state when a sortable header is clicked.
 *
 * - Clicking a new column starts ascending.
 * - Clicking the currently active column flips the direction (asc <-> desc).
 *
 * There is no third "unsorted" state.
 */
export function getNextSort(
  field: CommunityUpdatesSortBy,
  currentSortBy: CommunityUpdatesSortBy | null,
  currentSortOrder: CommunityUpdatesSortOrder
): SortState {
  if (currentSortBy === field) {
    return { sortBy: field, sortOrder: currentSortOrder === "asc" ? "desc" : "asc" };
  }
  return { sortBy: field, sortOrder: "asc" };
}
