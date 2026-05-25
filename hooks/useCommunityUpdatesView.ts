import { useQueryState } from "nuqs";
import { useCallback } from "react";
import { getNextSort } from "@/components/Pages/Community/Updates/sortCycle";
import type { UpdatesView } from "@/components/Pages/Community/Updates/UpdatesViewToggle";
import type {
  CommunityUpdatesSortBy,
  CommunityUpdatesSortOrder,
} from "@/services/community-project-updates.service";

const VALID_SORT_FIELDS: CommunityUpdatesSortBy[] = [
  "dueDate",
  "status",
  "title",
  "projectTitle",
  "grantTitle",
  "completionDate",
];

const isValidSortBy = (value: string | null): value is CommunityUpdatesSortBy =>
  value != null && (VALID_SORT_FIELDS as string[]).includes(value);

const isValidSortOrder = (value: string | null): value is CommunityUpdatesSortOrder =>
  value === "asc" || value === "desc";

interface CommunityUpdatesViewState {
  view: UpdatesView;
  isTableView: boolean;
  setView: (view: UpdatesView) => void;
  sortBy: CommunityUpdatesSortBy | null;
  sortOrder: CommunityUpdatesSortOrder;
  handleSort: (field: CommunityUpdatesSortBy) => void;
}

/**
 * URL-backed view + server-sort state for the community updates page.
 *
 * `view` (cards | table) and the sort (`sortBy` / `sortOrder`) live in the
 * query string so they are shareable. Switching back to cards drops the sort
 * params to keep the URL clean — sorting only applies to the table view.
 */
export function useCommunityUpdatesView(): CommunityUpdatesViewState {
  const [view, setViewQuery] = useQueryState<UpdatesView>("view", {
    defaultValue: "cards",
    serialize: (value) => (value === "table" ? "table" : ""),
    parse: (value) => (value === "table" ? "table" : "cards"),
  });

  const [sortByRaw, setSortByQuery] = useQueryState<CommunityUpdatesSortBy | null>("sortBy", {
    defaultValue: null,
    serialize: (value) => value ?? "",
    parse: (value) => (isValidSortBy(value) ? value : null),
  });

  const [sortOrderRaw, setSortOrderQuery] = useQueryState<CommunityUpdatesSortOrder | null>(
    "sortOrder",
    {
      defaultValue: null,
      serialize: (value) => value ?? "",
      parse: (value) => (isValidSortOrder(value) ? value : null),
    }
  );

  const sortBy = isValidSortBy(sortByRaw) ? sortByRaw : null;
  const sortOrder = isValidSortOrder(sortOrderRaw) ? sortOrderRaw : "asc";

  const handleSort = useCallback(
    (field: CommunityUpdatesSortBy) => {
      const next = getNextSort(field, sortBy, sortOrder);
      setSortByQuery(next.sortBy);
      setSortOrderQuery(next.sortOrder);
    },
    [sortBy, sortOrder, setSortByQuery, setSortOrderQuery]
  );

  const setView = useCallback(
    (nextView: UpdatesView) => {
      setViewQuery(nextView);
      if (nextView === "cards") {
        setSortByQuery(null);
        setSortOrderQuery(null);
      }
    },
    [setViewQuery, setSortByQuery, setSortOrderQuery]
  );

  return {
    view,
    isTableView: view === "table",
    setView,
    sortBy,
    sortOrder,
    handleSort,
  };
}
