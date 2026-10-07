"use client";
import { RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useProjectFilters } from "@/hooks/useProjectFilters";
import { useTracksForCommunity } from "@/hooks/useTracks";
import type { MaturityStageOptions, SortByOptions } from "@/types";
import { hasCommunityTrackFacet } from "@/utilities/community-flags";
import { parseCommunityProjectsPage } from "@/utilities/queries/v2/communityProjectsRequest";
import { useWhitelabel } from "@/utilities/whitelabel-context";
import { CommunityTrackFilter } from "../Pages/Communities/Impact/CommunityTrackFilter";
import { ProgramFilter } from "../Pages/Communities/Impact/ProgramFilter";
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

  const { isWhitelabel } = useWhitelabel();
  const communityTrackFacet = hasCommunityTrackFacet(communityId, isWhitelabel);
  // Empty uid disables the query where the facet is off.
  const {
    data: communityTracks = [],
    error: communityTracksError,
    refetch: refetchCommunityTracks,
  } = useTracksForCommunity(communityTrackFacet ? communityUid : "");

  // `changeProgramId` clears trackIds because the default track list is
  // program-scoped. A community track spans programs, so here the two
  // selections combine and a program change must keep the track.
  const handleProgramChange = useCallback(
    async (programId: string | null) => {
      if (!communityTrackFacet) {
        await changeProgramId(programId);
        return;
      }
      const trackIds = selectedTrackIds;
      await changeProgramId(programId);
      await changeTrackIds(trackIds);
    },
    [communityTrackFacet, changeProgramId, changeTrackIds, selectedTrackIds]
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
      <ProgramFilter onChange={handleProgramChange} />
      {communityTrackFacet && communityTracks.length > 0 ? (
        <CommunityTrackFilter
          tracks={communityTracks}
          selectedTrackId={selectedTrackIds?.[0] ?? null}
          onChange={(trackId) => changeTrackIds(trackId ? [trackId] : null)}
        />
      ) : null}
      {communityTrackFacet && communityTracksError && communityTracks.length === 0 ? (
        <div
          role="alert"
          className="flex flex-col justify-end gap-1.5 text-sm text-muted-foreground min-w-[220px]"
        >
          <span>Couldn&apos;t load tracks.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => refetchCommunityTracks()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-y-3 gap-x-8 justify-start flex-wrap sm:pb-3">
        {!communityTrackFacet && selectedProgramId && (
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
