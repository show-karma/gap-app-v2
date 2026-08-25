import { useEffect, useRef } from "react";
import { findGrantRowToOpen } from "./findGrantRowToOpen";

interface OpenableRow {
  grantUid: string;
  projectSlug: string;
}

interface UseAutoOpenGrantFromUrlParams<T extends OpenableRow> {
  projectParam?: string;
  grantParam?: string;
  searchQuery: string;
  isLoading: boolean;
  rows: T[];
  replaceQuery: (updates: Record<string, string | null>) => void;
  onOpen: (row: T) => void;
}

/**
 * Auto-opens a grant's details when `?project=<slug>` (optionally `&grant=<uid>`)
 * is in the URL.
 *
 * The project may be on any page of the paginated dataset, so we can't rely on
 * a simple row scan. The existing `search` param is used as a proxy: the backend
 * search filter matches exact project slugs, so `search=<slug>` collapses the
 * dataset to that project. Once the filtered data loads and a row matches, the
 * details open and `project`, `grant`, and the transient `search` are stripped.
 *
 * If `search=<slug>` is already active and still nothing matches, the slug
 * doesn't exist in this community — the URL is cleaned up and we give up.
 */
export function useAutoOpenGrantFromUrl<T extends OpenableRow>({
  projectParam,
  grantParam,
  searchQuery,
  isLoading,
  rows,
  replaceQuery,
  onOpen,
}: UseAutoOpenGrantFromUrlParams<T>): void {
  const autoOpenedProjectRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectParam || isLoading) return;
    if (autoOpenedProjectRef.current === projectParam) return;

    const match = findGrantRowToOpen(rows, projectParam, grantParam);
    if (!match) {
      if (searchQuery === projectParam) {
        replaceQuery({ project: null, grant: null, search: null });
      } else {
        replaceQuery({ search: projectParam, page: "1" });
      }
      return;
    }

    autoOpenedProjectRef.current = projectParam;
    onOpen(match);
    const clearSearch = searchQuery === projectParam ? null : searchQuery || null;
    replaceQuery({ project: null, grant: null, search: clearSearch });
  }, [projectParam, grantParam, isLoading, rows, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps
}
