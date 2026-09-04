"use client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useProjectFilters } from "@/hooks/useProjectFilters";
import type { MaturityStageOptions, SortByOptions } from "@/types";
import { isTracksAsPrimaryExplorerFacet } from "@/utilities/community-flags";
import { parseCommunityProjectsPage } from "@/utilities/queries/v2/communityProjectsRequest";
import { ProgramFilter } from "../Pages/Communities/Impact/ProgramFilter";
import { TrackAsProgramFilter } from "../Pages/Communities/Impact/TrackAsProgramFilter";
import { TrackFilter } from "../Pages/Communities/Impact/TrackFilter";
import { CategoryFilter } from "./CategoryFilter";
import type { CommunityProjectFilters } from "./communityProjectFilters";
import { MaturityStageFilter } from "./MaturityStageFilter";
import { SortFilter } from "./SortFilter";

interface CommunityGrantsToolbarProps {
  categoriesOptions: string[];
  communityId: string;
  communityUid: string;
  defaultSelectedCategories: string[];
  defaultSortBy: SortByOptions;
  defaultSelectedMaturityStage: MaturityStageOptions;
  /** Called with the URL's filter state on mount and whenever it changes. */
  onFiltersChange: (filters: CommunityProjectFilters) => void;
}

/**
 * The hub's filter toolbar, and the only place the URL is read for the grid.
 *
 * `useProjectFilters` is nuqs, which is `useSearchParams()` underneath — URL
 * data that, read in a Client Component with no boundary above, blocks the
 * prerender of the whole route (`CLIENT_HOOK_DYNAMIC`; the build named
 * `hooks/useProjectFilters.ts:17` via `CommunityGrants`). The hub is a
 * Cache-class route: its project grid must be in the initial HTML, so the
 * grid cannot sit behind a boundary (DEV-612) — but a toolbar can. It does
 * nothing without JavaScript, so nothing crawlable is lost by streaming it in,
 * and it renders no links, so the late chunk hides no part of the link graph.
 *
 * The URL stays the source of truth: the controls write it through nuqs, and
 * the effect mirrors every change up to the grid, which renders from the
 * server defaults until this mounts. That is the same shape #2102 gave the
 * funding-opportunities directory.
 */
export function CommunityGrantsToolbar({
  categoriesOptions,
  communityId,
  communityUid,
  defaultSelectedCategories,
  defaultSortBy,
  defaultSelectedMaturityStage,
  onFiltersChange,
}: CommunityGrantsToolbarProps) {
  const {
    selectedCategories,
    selectedSort,
    selectedMaturityStage,
    selectedProgramId,
    selectedTrackIds,
    changeCategories,
    changeSort,
    changeMaturityStage,
    changeProgramId,
    changeTrackIds,
  } = useProjectFilters({
    defaultSelectedCategories,
    defaultSortBy,
    defaultSelectedMaturityStage,
  });

  const searchParams = useSearchParams();
  const page = parseCommunityProjectsPage({ page: searchParams.get("page") ?? undefined });

  const tracksAsPrimaryFacet = isTracksAsPrimaryExplorerFacet(communityId);

  // Under TRACKS_AS_PRIMARY_EXPLORER_FACET the primary dropdown selects a
  // track directly — write trackIds and make sure no stale programId lingers
  // (the program/batch dropdown is not rendered for these communities, so
  // programId should never be set, but a hand-typed or carried-over URL param
  // could still have one).
  //
  // Both writes go through nuqs, so the effect below mirrors the result up to
  // the grid on the same path as every other filter — one contract, not two.
  const handleTrackFacetChange = useCallback(
    async (trackId: string | null) => {
      await changeProgramId(null);
      await changeTrackIds(trackId ? [trackId] : null);
    },
    [changeProgramId, changeTrackIds]
  );

  useEffect(() => {
    onFiltersChange({
      categories: selectedCategories,
      sortBy: selectedSort,
      maturityStage: selectedMaturityStage,
      programId: selectedProgramId,
      trackIds: selectedTrackIds,
      page,
    });
  }, [
    onFiltersChange,
    selectedCategories,
    selectedSort,
    selectedMaturityStage,
    selectedProgramId,
    selectedTrackIds,
    page,
  ]);

  return (
    <div className="flex items-stretch sm:items-end gap-x-3 flex-wrap gap-y-3 w-full">
      {tracksAsPrimaryFacet ? (
        <TrackAsProgramFilter
          communityUid={communityUid}
          selectedTrackId={selectedTrackIds?.[0] ?? null}
          onChange={handleTrackFacetChange}
        />
      ) : (
        <ProgramFilter onChange={changeProgramId} />
      )}

      <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-y-3 gap-x-8 justify-start flex-wrap sm:pb-3">
        {!tracksAsPrimaryFacet && selectedProgramId && (
          <TrackFilter
            onChange={changeTrackIds}
            communityUid={communityUid}
            selectedTrackIds={selectedTrackIds || []}
          />
        )}

        <CategoryFilter
          categories={categoriesOptions}
          selectedCategories={selectedCategories}
          onChange={changeCategories}
        />

        <SortFilter selectedSort={selectedSort} onChange={changeSort} />

        {communityId === "celo" && (
          <MaturityStageFilter
            selectedMaturityStage={selectedMaturityStage}
            onChange={changeMaturityStage}
          />
        )}
      </div>
    </div>
  );
}

/** What the toolbar's boundary paints until the URL is known. */
export function CommunityGrantsToolbarSkeleton() {
  return (
    <div
      className="flex items-stretch sm:items-end gap-x-3 flex-wrap gap-y-3 w-full animate-pulse"
      aria-hidden
    >
      <div className="h-14 flex-1 min-w-[220px] max-w-[400px] rounded-md bg-muted" />
      <div className="flex flex-1 gap-x-8 sm:pb-3">
        <div className="h-9 w-40 rounded-md bg-muted" />
        <div className="h-9 w-32 rounded-md bg-muted" />
      </div>
    </div>
  );
}
