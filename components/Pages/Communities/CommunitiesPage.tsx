"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InfiniteScroll from "react-infinite-scroll-component";
import { AutoSizer, Grid } from "react-virtualized";
import Image from "next/image";

import { chosenCommunities } from "@/utilities/chosenCommunities";
import { useOwnerStore } from "@/store";
import { useStaff } from "@/hooks/useStaff";
import { CommunityCard } from "./CommunityCard";
import { StatsCard } from "./StatsCard";
import { PAGES } from "@/utilities/pages";

interface MockCommunity {
  name: string;
  slug: string;
  uid: string;
  imageURL: {
    light: string;
    dark: string;
  };
  stats: {
    grants: number;
    projects: number;
    members: number;
  };
}

// Generate random stats for communities
const generateMockStats = () => ({
  grants: Math.floor(Math.random() * (999 - 100) + 100), // 100-999
  projects: Math.floor(Math.random() * (999 - 100) + 100), // 100-999
  members: Math.floor(Math.random() * (9999 - 1000) + 1000), // 1000-9999
});

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
  
  // Create mock communities - replicate first community 16 times with different stats
  const [communities] = useState<MockCommunity[]>(() => {
    const baseCommunities = chosenCommunities();
    const firstCommunity = baseCommunities[0];
    
    if (!firstCommunity) return [];
    
    return Array.from({ length: 16 }, (_, index) => ({
      ...firstCommunity,
      uid: `${firstCommunity.uid}-${index}`,
      slug: `${firstCommunity.slug}-${index}`,
      name: `${firstCommunity.name} ${index + 1}`,
      stats: generateMockStats(),
    }));
  });

  const [displayedCommunities, setDisplayedCommunities] = useState<MockCommunity[]>(communities.slice(0, 12));
  const [hasMore, setHasMore] = useState(communities.length > 12);

  const loadMore = () => {
    const currentLength = displayedCommunities.length;
    const moreItems = communities.slice(currentLength, currentLength + 8);
    
    if (moreItems.length > 0) {
      setDisplayedCommunities(prev => [...prev, ...moreItems]);
      setHasMore(currentLength + moreItems.length < communities.length);
    } else {
      setHasMore(false);
    }
  };

  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isStaff } = useStaff();

  const hasAdminAccess = isOwner || isStaff;

  const handleAddCommunity = () => {
    router.push(PAGES.ADMIN.COMMUNITIES);
  };

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
            className="bg-primary-500 text-white rounded-s px-4 py-2 mt-5 w-fit mx-auto hover:bg-primary-600 transition-colors"
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
            const rowCount = summaryStats.length / columns;
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
                        paddingBottom: gap,
                        paddingRight: columnIndex < columns - 1 ? gap : 0,
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
        {displayedCommunities.length > 0 ? (
          <InfiniteScroll
            dataLength={displayedCommunities.length}
            next={loadMore}
            hasMore={hasMore}
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
                const rowCount = Math.ceil(displayedCommunities.length / columns);
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
                      const community = displayedCommunities[itemIndex];

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