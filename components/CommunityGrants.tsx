"use client";
import type { InfiniteData } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useCommunityProjectsInfinite } from "@/hooks/useCommunityProjectsInfinite";
import { useProjectFilters } from "@/hooks/useProjectFilters";
import { useCommunityStore } from "@/store/community";
import type { MaturityStageOptions, SortByOptions } from "@/types";
import type { CommunityProjects } from "@/types/v2/community";
import { CategoryFilter } from "./CommunityGrants/CategoryFilter";
import { CrawlableCommunityPagination } from "./CommunityGrants/CrawlableCommunityPagination";
import { MaturityStageFilter } from "./CommunityGrants/MaturityStageFilter";
import { ProjectsGrid } from "./CommunityGrants/ProjectsGrid";
import { ProjectsGridSkeleton } from "./CommunityGrants/ProjectsGridSkeleton";
import { SortFilter } from "./CommunityGrants/SortFilter";
import { ProgramFilter } from "./Pages/Communities/Impact/ProgramFilter";
import { TrackFilter } from "./Pages/Communities/Impact/TrackFilter";
import { ProgramBanner } from "./ProgramBanner";
import { errorManager } from "./Utilities/errorManager";

interface CommunityGrantsProps {
  categoriesOptions: string[];
  defaultSelectedCategories: string[];
  defaultSortBy: SortByOptions;
  defaultSelectedMaturityStage: MaturityStageOptions;
  communityUid: string;
  initialProjects: CommunityProjects;
  /** Page the server fetched `initialProjects` for. Defaults to 1. */
  initialPage?: number;
  /** `PAGES.COMMUNITY.*` route the crawlable Previous/Next links point at. */
  paginationBasePath: string;
}

const sameStringList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

export const CommunityGrants = ({
  categoriesOptions,
  defaultSelectedCategories,
  defaultSortBy,
  defaultSelectedMaturityStage,
  communityUid,
  initialProjects,
  initialPage = 1,
  paginationBasePath,
}: CommunityGrantsProps) => {
  const params = useParams();
  const communityId = params.communityId as string;
  const { setFilteredStats, setIsLoadingFilters } = useCommunityStore();

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

  // The server renders the hub with the filters at their defaults. Only seed the
  // cache while the live URL state still matches, otherwise a filtered view
  // would show the unfiltered server payload.
  const matchesInitialState =
    selectedSort === defaultSortBy &&
    selectedMaturityStage === defaultSelectedMaturityStage &&
    !selectedProgramId &&
    !selectedTrackIds?.length &&
    sameStringList(selectedCategories, defaultSelectedCategories);

  // `getCommunityProjects` swallows every failure into an empty page, so an
  // empty payload is indistinguishable from an indexer blip — don't seed it, and
  // let the client refetch decide between "no projects" and real data.
  const seededData: InfiniteData<CommunityProjects, number> | undefined = useMemo(
    () =>
      matchesInitialState && initialProjects.payload.length > 0
        ? { pages: [initialProjects], pageParams: [initialPage] }
        : undefined,
    [matchesInitialState, initialProjects, initialPage]
  );

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isRefetching } =
    useCommunityProjectsInfinite({
      communityId,
      sortBy: selectedSort,
      categories: selectedCategories,
      maturityStage: selectedMaturityStage,
      programId: selectedProgramId,
      trackIds: selectedTrackIds,
      enabled: !!communityId,
      initialData: seededData,
      initialPage: matchesInitialState ? initialPage : 1,
    });

  // Check if we're loading due to filter changes. Every filter is part of the
  // query key, so any data we hold already belongs to the current filters —
  // keep rendering it through a same-key refetch instead of blanking to a
  // skeleton. Without this the server-seeded page is never visible: React Query
  // reports `isRefetching` optimistically on the very first render because of
  // `refetchOnMount: "always"`.
  const isFilterLoading =
    (isLoading || (isRefetching && !isFetchingNextPage)) && !data?.pages?.length;

  const projects = useMemo(() => {
    // Don't show stale data when filters are changing
    if (isFilterLoading) {
      return [];
    }
    if (!data?.pages) {
      return initialProjects.payload;
    }
    return data.pages.flatMap((page) => page.payload);
  }, [data?.pages, initialProjects.payload, isFilterLoading]);

  const totalCount = useMemo(() => {
    if (!data?.pages?.length) {
      return initialProjects.pagination.totalCount;
    }
    return data.pages[0].pagination.totalCount;
  }, [data?.pages, initialProjects.pagination.totalCount]);

  // Crawlable Previous/Next is only meaningful for the unfiltered, server-rendered
  // view — filtered views stay client-only.
  const totalPages =
    data?.pages?.[0]?.pagination.totalPages ?? initialProjects.pagination.totalPages;
  const showCrawlablePagination = matchesInitialState && projects.length > 0;

  useEffect(() => {
    // Update loading state in the store
    setIsLoadingFilters(isFilterLoading);

    if (!isFilterLoading) {
      // When data is loaded, update with the actual count
      // Note: Currently the API only returns totalProjects count when filtered
      // TODO: Update when API supports filtered grants/milestones counts
      setFilteredStats({
        totalProjects: totalCount,
        totalGrants: 0, // Will be updated when API supports it
        totalMilestones: 0, // Will be updated when API supports it
      });
    }
  }, [totalCount, isFilterLoading, setFilteredStats, setIsLoadingFilters]);

  useEffect(() => {
    if (error) {
      errorManager("Error while fetching community projects", error, {
        sortBy: selectedSort,
        categories: selectedCategories,
        selectedProgramId: selectedProgramId || undefined,
        selectedTrackIds: selectedTrackIds || undefined,
      });
    }
  }, [error, selectedSort, selectedCategories, selectedProgramId, selectedTrackIds]);

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    // Don't auto-load when filters are changing
    if (isFilterLoading || isFetchingNextPage || !hasNextPage) {
      return;
    }

    const handleScroll = () => {
      if (document.documentElement.scrollHeight <= window.innerHeight) {
        loadMore();
      }
    };

    const timeoutId = setTimeout(handleScroll, 200);
    return () => clearTimeout(timeoutId);
  }, [hasNextPage, loadMore, isFilterLoading, isFetchingNextPage]);

  const handleCategoryChange = useCallback(
    (categories: string[]) => {
      changeCategories(categories);
    },
    [changeCategories]
  );

  const handleSortChange = useCallback(
    (sort: SortByOptions) => {
      changeSort(sort);
    },
    [changeSort]
  );

  const handleMaturityStageChange = useCallback(
    (stage: MaturityStageOptions) => {
      changeMaturityStage(stage);
    },
    [changeMaturityStage]
  );

  const handleProgramChange = useCallback(
    (programId: string | null) => {
      changeProgramId(programId);
    },
    [changeProgramId]
  );

  const handleTrackChange = useCallback(
    (trackIds: string[] | null) => {
      changeTrackIds(trackIds);
    },
    [changeTrackIds]
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between flex-row flex-wrap-reverse max-lg:flex-wrap max-lg:flex-col-reverse max-lg:justify-start max-lg:items-start gap-3 max-lg:gap-4">
        <div className="flex items-stretch sm:items-end gap-x-3 flex-wrap gap-y-3 w-full">
          <ProgramFilter onChange={handleProgramChange} />

          <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-y-3 gap-x-8 justify-start flex-wrap sm:pb-3">
            {selectedProgramId && (
              <TrackFilter
                onChange={handleTrackChange}
                communityUid={communityUid}
                selectedTrackIds={selectedTrackIds || []}
              />
            )}

            <CategoryFilter
              categories={categoriesOptions}
              selectedCategories={selectedCategories}
              onChange={handleCategoryChange}
            />

            <SortFilter selectedSort={selectedSort} onChange={handleSortChange} />

            {communityId === "celo" && (
              <MaturityStageFilter
                selectedMaturityStage={selectedMaturityStage}
                onChange={handleMaturityStageChange}
              />
            )}
          </div>
        </div>
      </div>

      <ProgramBanner />

      <section className="flex flex-col gap-4 md:flex-row">
        <div className="h-full w-full mb-8">
          {!isFilterLoading && projects.length > 0 ? (
            <InfiniteScroll
              dataLength={projects.length}
              next={loadMore}
              hasMore={hasNextPage || false}
              loader={null}
              style={{
                width: "100%",
                height: "100%",
              }}
            >
              <ProjectsGrid projects={projects} />
            </InfiniteScroll>
          ) : null}

          {showCrawlablePagination && (
            <CrawlableCommunityPagination
              basePath={paginationBasePath}
              currentPage={initialPage}
              hasPrev={initialPage > 1}
              hasNext={initialPage < totalPages}
            />
          )}

          {(isFilterLoading || isFetchingNextPage) && (
            <div className="w-full flex items-center justify-center">
              <ProjectsGridSkeleton />
            </div>
          )}

          {!isFilterLoading && !isFetchingNextPage && projects.length === 0 && (
            <div className="w-full flex items-center justify-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No projects found</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
