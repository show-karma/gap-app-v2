"use client";
import type { InfiniteData } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useCommunityProjectsInfinite } from "@/hooks/useCommunityProjectsInfinite";
import { useCommunityStore } from "@/store/community";
import type { MaturityStageOptions, SortByOptions } from "@/types";
import type { CommunityProjects } from "@/types/v2/community";
import { useRenderedAt } from "@/utilities/render-clock-context";
import {
  CommunityGrantsToolbar,
  CommunityGrantsToolbarSkeleton,
} from "./CommunityGrants/CommunityGrantsToolbar";
import { CrawlableCommunityPagination } from "./CommunityGrants/CrawlableCommunityPagination";
import {
  type CommunityProjectFilters,
  sameCommunityProjectFilters,
} from "./CommunityGrants/communityProjectFilters";
import { ProjectsGrid } from "./CommunityGrants/ProjectsGrid";
import { ProjectsGridSkeleton } from "./CommunityGrants/ProjectsGridSkeleton";
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

/**
 * The community hub's project grid.
 *
 * The grid is the crawlable content of a Cache-class route, so it renders from
 * the server's defaults without reading the URL: every URL read lives in
 * `CommunityGrantsToolbar` behind a Suspense boundary, and reaches the grid as
 * state after hydration. Until then the seeded page 1 is what the reader sees
 * — which is also exactly what a crawler and a no-JS reader see.
 */
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

  const defaultFilters = useMemo<CommunityProjectFilters>(
    () => ({
      categories: defaultSelectedCategories,
      sortBy: defaultSortBy,
      maturityStage: defaultSelectedMaturityStage,
      programId: null,
      trackIds: null,
      page: initialPage,
    }),
    [defaultSelectedCategories, defaultSortBy, defaultSelectedMaturityStage, initialPage]
  );

  const [filters, setFilters] = useState<CommunityProjectFilters>(defaultFilters);
  // Stable by construction, and it swallows no-op updates so the toolbar's
  // mount effect cannot re-render the grid for a URL that says nothing new.
  const handleFiltersChange = useCallback((next: CommunityProjectFilters) => {
    setFilters((prev) => (sameCommunityProjectFilters(prev, next) ? prev : next));
  }, []);

  // The server renders the hub with the filters at their defaults. Only seed the
  // cache while the live filter state still matches, otherwise a filtered view
  // would show the unfiltered server payload.
  const matchesInitialState = sameCommunityProjectFilters(filters, defaultFilters);
  // Crawlable Previous/Next is only meaningful for the unfiltered view —
  // filtered views stay client-only. `page` is not a filter for this purpose:
  // a deep page is still the unfiltered list.
  const isUnfiltered = sameCommunityProjectFilters(
    { ...filters, page: defaultFilters.page },
    defaultFilters
  );

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
  const seededAt = useRenderedAt();

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isRefetching } =
    useCommunityProjectsInfinite({
      communityId,
      sortBy: filters.sortBy,
      categories: filters.categories,
      maturityStage: filters.maturityStage,
      programId: filters.programId,
      trackIds: filters.trackIds,
      enabled: !!communityId,
      initialData: seededData,
      initialDataUpdatedAt: seededAt,
      initialPage: filters.page,
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

  const totalPages =
    data?.pages?.[0]?.pagination.totalPages ?? initialProjects.pagination.totalPages;
  const showCrawlablePagination = isUnfiltered && projects.length > 0;

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
        sortBy: filters.sortBy,
        categories: filters.categories,
        selectedProgramId: filters.programId || undefined,
        selectedTrackIds: filters.trackIds || undefined,
      });
    }
  }, [error, filters.sortBy, filters.categories, filters.programId, filters.trackIds]);

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

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between flex-row flex-wrap-reverse max-lg:flex-wrap max-lg:flex-col-reverse max-lg:justify-start max-lg:items-start gap-3 max-lg:gap-4">
        {/* The toolbar and the program banner are the URL readers; they stream
            in behind their own boundaries so the grid below does not. */}
        <Suspense fallback={<CommunityGrantsToolbarSkeleton />}>
          <CommunityGrantsToolbar
            categoriesOptions={categoriesOptions}
            communityId={communityId}
            communityUid={communityUid}
            defaultSelectedCategories={defaultSelectedCategories}
            defaultSortBy={defaultSortBy}
            defaultSelectedMaturityStage={defaultSelectedMaturityStage}
            onFiltersChange={handleFiltersChange}
          />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <ProgramBanner />
      </Suspense>

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
              currentPage={filters.page}
              hasPrev={filters.page > 1}
              hasNext={filters.page < totalPages}
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
