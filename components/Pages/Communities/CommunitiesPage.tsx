"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import InfiniteScroll from "react-infinite-scroll-component";
import { AutoSizer, Grid } from "react-virtualized";
import { CommunityCard } from "./CommunityCard";
import { StatsCard } from "./StatsCard";
import { PAGES } from "@/utilities/pages";
import { useCommunities } from "@/hooks/useCommunities";
import { useOwnerStore } from "@/store";
import { useStaff } from "@/hooks/useStaff";
import Image from "next/image";

// Mock summary stats
const summaryStats = [
  { title: "Active Communities", value: Math.floor(Math.random() * (999 - 100) + 100) },
  { title: "Projects Funded", value: Math.floor(Math.random() * (9999 - 1000) + 1000) },
  { title: "Grants Tracked", value: `$${(Math.floor(Math.random() * (999 - 100) + 100) / 10).toFixed(1)}M` },
  { title: "Milestones Completed", value: Math.floor(Math.random() * (9999 - 1000) + 1000) },
];

// Responsive breakpoint function
const getResponsiveColumns = (width: number) => {
  if (width >= 1200) return 4; // 4 columns for large screens
  if (width >= 768) return 2;  // 2 columns for medium screens
  return 1;                    // 1 column for small screens
};

export const CommunitiesPage = () => {
  const router = useRouter();
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isStaff } = useStaff();
  
  const hasAdminAccess = isOwner || isStaff;
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isError,
    error,
  } = useCommunities({ limit: 12, includeStats: true });

  const communities = useMemo(() => {
    return data?.pages.flatMap((page) => page.payload) || [];
  }, [data]);

  const handleAddCommunity = () => {
    router.push(PAGES.ADMIN.COMMUNITIES);
  };

  const loadMore = () => {
    if (hasNextPage) {
      fetchNextPage();
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-500 dark:text-red-400">
          Error loading communities: {error?.message}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Loading communities...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-full overflow-hidden">
      {/* Page Title */}
      <div className="flex flex-col gap-2 items-center justify-center">
        <div className="flex flex-row gap-2 items-center justify-center bg-primary-200 rounded-full w-fit h-[40px] px-4 mx-auto">
          <Image
            width={24}
            height={24}
            src="/icons/impact.png"
            alt="Rocket icon"
          />
          <p className="text-primary-700 font-medium">
            Join 200+ leading communities
          </p>
        </div>

        <h1 className="text-[72px] font-bold text-black dark:text-white">Communities</h1>
        <p className="text-black dark:text-white text-lg max-w-4xl text-center">
          Explore the ecosystem of DAOs, protocols, and organizations building the future 
          through transparent grant management and accountability.
        </p>

        {hasAdminAccess && (
          <button 
            type="button" 
            onClick={handleAddCommunity}
            className="bg-primary-500 text-white rounded-sm px-4 py-2 mt-5 w-fit mx-auto hover:bg-primary-600 transition-colors"
          >
            Add your community
          </button>
        )}
      </div>

      {/* Summary Stats Row - Using same Grid system as communities */}
      <div className="w-full overflow-hidden">
        <AutoSizer disableHeight>
          {({ width }) => {
            const columns = getResponsiveColumns(width);
            const gap = 24;
            const actualCardWidth = Math.floor((width - (columns - 1) * gap) / columns);
            const rowHeight = 113 + gap;
            const rowCount = Math.ceil(summaryStats.length / columns);
            const height = rowHeight * rowCount;

            return (
              <Grid
                key={`stats-grid-${width}-${columns}`}
                height={height}
                width={width}
                rowCount={rowCount}
                rowHeight={rowHeight}
                columnWidth={actualCardWidth + gap}
                columnCount={columns}
                style={{ overflow: "visible" }}
                cellRenderer={({ columnIndex, key, rowIndex, style }) => {
                  const itemIndex = rowIndex * columns + columnIndex;
                  const stat = summaryStats[itemIndex];

                  if (!stat) return null;

                  return (
                    <div
                      key={key}
                      style={{
                        ...style,
                        width: actualCardWidth,
                        paddingRight: columnIndex < columns - 1 ? gap : 0,
                        paddingBottom: gap,
                        overflow: "visible",
                      }}
                    >
                      <StatsCard title={stat.title} value={stat.value} />
                    </div>
                  );
                }}
              />
            );
          }}
        </AutoSizer>
      </div>

      {/* Communities Grid with Infinite Scroll */}
      <div className="w-full overflow-hidden">
        {isLoading && communities.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-500 dark:text-gray-400">Loading communities...</p>
          </div>
        ) : communities.length > 0 ? (
          <InfiniteScroll
            dataLength={communities.length}
            next={loadMore}
            hasMore={hasNextPage || false}
            loader={null}
            style={{
              width: "100%",
              overflow: "visible",
            }}
          >
            <AutoSizer disableHeight>
              {({ width }) => {
                const columns = getResponsiveColumns(width);
                const gap = 24;
                const actualCardWidth = Math.floor((width - (columns - 1) * gap) / columns);
                const rowHeight = 318 + gap; // Card height + gap
                const rowCount = Math.ceil(communities.length / columns);
                const height = rowCount * rowHeight;

                return (
                  <Grid
                    key={`grid-${width}-${columns}`}
                    height={height + 60}
                    width={width}
                    rowCount={rowCount}
                    rowHeight={rowHeight}
                    columnWidth={actualCardWidth + gap}
                    columnCount={columns}
                    style={{ overflow: "visible" }}
                    cellRenderer={({ columnIndex, key, rowIndex, style }) => {
                      const itemIndex = rowIndex * columns + columnIndex;
                      const community = communities[itemIndex];

                      if (!community) return null;

                      return (
                        <div
                          key={key}
                          style={{
                            ...style,
                            width: actualCardWidth,
                            paddingRight: columnIndex < columns - 1 ? gap : 0,
                            paddingBottom: gap,
                            overflow: "visible",
                          }}
                        >
                          <CommunityCard community={community} />
                        </div>
                      );
                    }}
                  />
                );
              }}
            </AutoSizer>
          </InfiniteScroll>
        ) : (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-500 dark:text-gray-400">No communities found.</p>
          </div>
        )}
      </div>
    </div>
  );
}; 