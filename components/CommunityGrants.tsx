"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useCommunityProjectsInfinite } from "@/hooks/useCommunityProjectsInfinite";
import { useProjectFilters } from "@/hooks/useProjectFilters";
import { useCommunityStore } from "@/store/community";
import type { MaturityStageOptions, SortByOptions } from "@/types";
import type { CommunityProjectsV2Response, CommunityStatsV2 } from "@/types/community";
import { CategoryFilter } from "./CommunityGrants/CategoryFilter";
import { MaturityStageFilter } from "./CommunityGrants/MaturityStageFilter";
import { ProjectsGrid } from "./CommunityGrants/ProjectsGrid";
import { SortFilter } from "./CommunityGrants/SortFilter";
import { ProgramFilter } from "./Pages/Communities/Impact/ProgramFilter";
import { TrackFilter } from "./Pages/Communities/Impact/TrackFilter";
import { CardListSkeleton } from "./Pages/Communities/Loading";
import { ProgramBanner } from "./ProgramBanner";
import { errorManager } from "./Utilities/errorManager";

interface CommunityGrantsProps {
  categoriesOptions: string[];
  defaultSelectedCategories: string[];
  defaultSortBy: SortByOptions;
  defaultSelectedMaturityStage: MaturityStageOptions;
  communityUid: string;
  communityStats: CommunityStatsV2;
  initialProjects: CommunityProjectsV2Response;
}

export const CommunityGrants = ({
  categoriesOptions,
  defaultSelectedCategories,
  defaultSortBy,
  defaultSelectedMaturityStage,
  communityUid,
  communityStats: _communityStats,
  initialProjects,
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

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isRefetching } =
    useCommunityProjectsInfinite({
      communityId,
      sortBy: selectedSort,
      categories: selectedCategories,
      maturityStage: selectedMaturityStage,
      programId: selectedProgramId,
      trackIds: selectedTrackIds,
      enabled: !!communityId,
    });

  // Check if we're loading due to filter changes
  const isFilterLoading = isLoading || (isRefetching && !isFetchingNextPage);

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
        <div className="flex items-center gap-x-3 flex-wrap gap-y-2 w-full">
          <ProgramFilter onChange={handleProgramChange} />

          <div className="flex flex-1 flex-row gap-8 justify-end flex-wrap">
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

          {(isFilterLoading || isFetchingNextPage) && (
            <div className="w-full flex items-center justify-center">
              <CardListSkeleton />
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
