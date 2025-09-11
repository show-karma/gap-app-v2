"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import InfiniteScroll from "react-infinite-scroll-component";
import { AutoSizer, Grid } from "react-virtualized";
import { CommunityCard } from "./CommunityCard";
import { StatsCard } from "./StatsCard";
import { CommunitiesSkeleton } from "./Loading";
import { PAGES } from "@/utilities/pages";
import { useCommunities } from "@/hooks/useCommunities";
import { useCommunityStats } from "@/hooks/useCommunityStats";
import { useOwnerStore } from "@/store";
import { useStaff } from "@/hooks/useStaff";
import Image from "next/image";

// Responsive breakpoint function
const getResponsiveColumns = (width: number) => {
  if (width >= 1200) return 4; // 4 columns for large screens
  if (width >= 768) return 2;  // 2 columns for medium screens
  return 1;                    // 1 column for small screens
};

export const CommunitiesPage = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading: communitiesLoading,
    isError: communitiesError,
    error: communitiesErrorMessage,
  } = useCommunities({ limit: 12, includeStats: true });

  const {
    data: summaryStats,
    isLoading: statsLoading,
    isError: statsError,
  } = useCommunityStats();

  const communities = useMemo(() => {
    return data?.pages.flatMap((page) => page.payload) || [];
  }, [data]);

  const loadMore = () => {
    if (hasNextPage) {
      fetchNextPage();
    }
  };

  // Show skeleton if both communities and stats are loading
  if (communitiesLoading && statsLoading) {
    return <CommunitiesSkeleton />;
  }

  if (communitiesError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-500 dark:text-red-400">
          Error loading communities: {communitiesErrorMessage?.message}
        </p>
      </div>
    );
  }

  if (communitiesLoading) {
    return <CommunitiesSkeleton />;
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
          <p className="text-primary-700 text-xs sm:text-base font-medium">
            Trusted by the top web3 ecosystems
          </p>
        </div>

        <h1 className="text-4xl sm:text-[72px] font-bold text-black dark:text-white">Communities on Karma</h1>
        <p className="text-black dark:text-white text-sm sm:text-lg max-w-4xl text-center">
          Explore the ecosystem of DAOs, protocols, and organizations growing their 
          communities through transparent funding, accountability, and impact measurement
        </p>

        <a
          href="https://tally.so/r/wd0jeq"
          target="_blank"
          rel="noreferrer"
        >
          <button
            type="button"
            className="bg-primary-500 text-white text-xs sm:text-base font-bold rounded-sm px-4 py-2 mt-5 w-fit mx-auto hover:bg-primary-600 transition-colors"
          >
            Add your community
          </button>
        </a>
      </div>

      {/* Summary Stats Row - Only show if stats loaded successfully */}
      {summaryStats && !statsError && (
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
      )}

      {/* Communities Grid with Infinite Scroll */}
      <div className="w-full overflow-hidden">
        {communitiesLoading && communities.length === 0 ? (
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

      <div className="relative w-full bg-gradient-to-r from-[#D6DFFF] to-white dark:from-slate-800 dark:to-slate-700 rounded-2xl p-8 overflow-hidden mb-10">
        <div className="absolute right-0 top-0 w-1/2 h-full pointer-events-none">
          <div className="absolute top-[100px] right-0 md:top-20 md:right-20 transform rotate-[20deg]">
            <Image
              src="/assets/communities-banner/vector-1.png"
              alt="Community member"
              width={150}
              height={150}
              className="rounded-full object-cover w-[80px] md:w-[150px] md:h-[150px]"
            />
          </div>
          <div className="absolute top-1 invisible md:visible right-40 md:right-[220px] transform rotate-[20deg]">
            <Image
              src="/assets/communities-banner/mmur.jpg"
              alt="Decorative element"
              width={100}
              height={100}
              className="rounded-full object-cover w-[70px] h-[70px] md:w-[100px] md:h-[100px]"
            />
          </div>
          <div className="absolute top-[10px] right-20 md:top-[200px] md:right-[220px] transform rotate-[20deg]">
            <Image
              src="/assets/communities-banner/vector-2.png"
              alt="Decorative element"
              width={180}
              height={180}
              className="rounded-full object-cover w-[100px] md:w-[180px] md:h-[180px]"
            />
          </div>
          <div className="absolute invisible md:visible top-[-50px] right-1 md:top-[-100px] md:right-2 transform rotate-[20deg]">
            <Image
              src="/assets/communities-banner/stock.jpg"
              alt="Decorative element"
              width={180}
              height={180}
              className="rounded-full object-cover w-[100px] h-[100px] md:w-[180px] md:h-[180px]"
            />
          </div>
          <div className="absolute bottom-[-10px] right-1 md:top-[260px] md:right-2 transform rotate-[20deg]">
            <Image
              src="/assets/communities-banner/vector-3.png"
              alt="Decorative element"
              width={180}
              height={180}
              className="rounded-full object-cover w-[80px] h-[80px] md:w-[180px] md:h-[180px]"
            />
          </div>
        </div>

        <div className="relative z-1 flex flex-col max-w-md lg:max-w-2xl">
          <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
            Add Your Community
          </h2>
          <p className="text-lg text-black dark:text-gray-300 mb-6 leading-relaxed">
            Join the ecosystem of Web3 organizations using Karma GAP to manage grants with
            complete transparency and accountability. Build trust, track impact, and grow your
            community.
          </p>
          <a
            href="https://tally.so/r/wd0jeq"
            target="_blank"
            rel="noreferrer"
            className="w-fit"
          >
            <button
              type="button"
              className="bg-primary-500 text-white font-bold rounded-sm px-4 py-2 mt-5 w-fit mx-auto hover:bg-primary-600 transition-colors"
            >
              Add Your Community
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}; 
