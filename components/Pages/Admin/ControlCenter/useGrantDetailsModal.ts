import { useCallback, useEffect, useState } from "react";
import { findGrantRowToOpen } from "./findGrantRowToOpen";

interface OpenableRow {
  grantUid: string;
  projectSlug: string;
}

interface UseGrantDetailsModalParams<T extends OpenableRow> {
  projectParam?: string;
  grantParam?: string;
  searchQuery: string;
  isLoading: boolean;
  rows: T[];
  replaceQuery: (updates: Record<string, string | null>) => void;
}

interface GrantDetailsModalState {
  detailsGrantUid: string | null;
  detailsModalOpen: boolean;
  openDetails: (grantUid: string) => void;
  closeDetails: () => void;
  setDetailsModalOpen: (open: boolean) => void;
}

/**
 * Owns the grant details modal state and auto-opens it when
 * `?project=<slug>` (optionally `&grant=<uid>`) is in the URL.
 *
 * The project may be on any page of the paginated dataset, so we can't rely on
 * a simple row scan. The existing `search` param is used as a proxy: the backend
 * search filter matches exact project slugs, so `search=<slug>` collapses the
 * dataset to that project. Once the filtered data loads and a row matches, the
 * modal opens and `project`, `grant`, and the transient `search` are stripped.
 *
 * If `search=<slug>` is already active and still nothing matches, the slug
 * doesn't exist in this community — the URL is cleaned up and we give up.
 */
export function useGrantDetailsModal<T extends OpenableRow>({
  projectParam,
  grantParam,
  searchQuery,
  isLoading,
  rows,
  replaceQuery,
}: UseGrantDetailsModalParams<T>): GrantDetailsModalState {
  const [detailsGrantUid, setDetailsGrantUid] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [autoOpenedProject, setAutoOpenedProject] = useState<string | null>(null);

  const openDetails = useCallback((grantUid: string) => {
    setDetailsGrantUid(grantUid);
    setDetailsModalOpen(true);
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsModalOpen(false);
    setDetailsGrantUid(null);
  }, []);

  // Auto-open is a state adjustment derived from props, so it happens during
  // render (guarded by `autoOpenedProject`) rather than in an effect.
  const pendingAutoOpen = projectParam && !isLoading && autoOpenedProject !== projectParam;
  const autoOpenMatch = pendingAutoOpen
    ? findGrantRowToOpen(rows, projectParam, grantParam)
    : undefined;
  if (pendingAutoOpen && autoOpenMatch) {
    setAutoOpenedProject(projectParam);
    setDetailsGrantUid(autoOpenMatch.grantUid);
    setDetailsModalOpen(true);
  }

  // URL side effects: narrow the dataset until the row shows up, then strip
  // the auto-open params once it has opened.
  useEffect(() => {
    if (!projectParam || isLoading) return;

    if (autoOpenedProject === projectParam) {
      const clearSearch = searchQuery === projectParam ? null : searchQuery || null;
      replaceQuery({ project: null, grant: null, search: clearSearch });
      return;
    }

    if (findGrantRowToOpen(rows, projectParam, grantParam)) return;

    if (searchQuery === projectParam) {
      replaceQuery({ project: null, grant: null, search: null });
    } else {
      replaceQuery({ search: projectParam, page: "1" });
    }
  }, [projectParam, grantParam, isLoading, rows, searchQuery, autoOpenedProject]); // eslint-disable-line react-hooks/exhaustive-deps

  return { detailsGrantUid, detailsModalOpen, openDetails, closeDetails, setDetailsModalOpen };
}

/**
 * Resolves the grant currently shown in the details modal from the live rows,
 * keeping the last known snapshot when the grant leaves the current page so
 * the sidebar doesn't blank while it's open.
 */
export function useLastKnownGrant<T extends { grantUid: string }>(
  grantUid: string | null,
  rows: T[]
): T | null {
  const [lastKnown, setLastKnown] = useState<T | null>(null);

  if (!grantUid) {
    if (lastKnown !== null) setLastKnown(null);
    return null;
  }

  const fresh = rows.find((row) => row.grantUid === grantUid) ?? null;
  if (fresh && fresh !== lastKnown) setLastKnown(fresh);
  return fresh ?? lastKnown;
}
