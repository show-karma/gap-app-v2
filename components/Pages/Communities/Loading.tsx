import { Skeleton } from "@/components/Utilities/Skeleton";
import { AutoSizer, Grid } from "react-virtualized";

const pickColor = (index: number) => {
  const cardColors = [
    "#5FE9D0",
    "#875BF7",
    "#F97066",
    "#FDB022",
    "#A6EF67",
    "#84ADFF",
    "#EF6820",
    "#EE46BC",
    "#EEAAFD",
    "#67E3F9",
  ];
  return cardColors[index % cardColors.length];
};

// Responsive breakpoint function (same as CommunitiesPage)
const getResponsiveColumns = (width: number) => {
  if (width >= 1200) return 4; // 4 columns for large screens
  if (width >= 768) return 2;  // 2 columns for medium screens
  return 1;                    // 1 column for small screens
};

const StatsSkeleton = () => (
  <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-sm animate-pulse">
    <div className="h-9 w-16 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
    <div className="h-5 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
  </div>
);

const CommunityCardSkeleton = () => (
  <div
    className="flex flex-col p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-sm w-full animate-pulse"
    style={{ height: '318px' }}
  >
    {/* Community Image Skeleton */}
    <div className="flex justify-center mb-3 min-h-[72px] h-18 mx-auto">
      <div className="w-[72px] h-[72px] bg-gray-300 dark:bg-gray-600 rounded-full"></div>
    </div>

    {/* Community Name Skeleton */}
    <div className="text-center mb-3 min-w-0">
      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mx-auto w-3/4 mb-1"></div>
      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mx-auto w-1/2"></div>
    </div>

    {/* Category Tag Skeleton */}
    <div className="flex justify-center mb-3 min-h-[28px]">
      <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
    </div>

    {/* Stats Skeleton */}
    <div className="flex justify-center space-x-4 mb-3 min-w-0">
      <div className="text-center min-w-0">
        <div className="h-4 w-6 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
        <div className="h-4 w-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>
      <div className="text-center min-w-0">
        <div className="h-4 w-6 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
        <div className="h-4 w-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>
      <div className="text-center min-w-0">
        <div className="h-4 w-8 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
        <div className="h-4 w-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>
    </div>

    {/* Go Button Skeleton */}
    <div className="flex justify-end mt-auto pt-2">
      <div className="w-20 h-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
    </div>
  </div>
);

const CardSkeleton = ({ index }: { index: number }) => {
  return (
    <div className="flex h-[360px] w-full max-w-full relative flex-col items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-2 transition-all duration-300 ease-in-out hover:opacity-80">
      <div className="w-full flex flex-col gap-1 ">
        <div
          className="h-[4px] w-full rounded-full mb-2.5"
          style={{
            background: pickColor(index),
          }}
        />

        <div className="flex w-full flex-col px-3 gap-1">
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-full h-4" />
          <div className="flex flex-row gap-2 items-center mb-2">
            <p className="text-sm font-medium text-gray-400  dark:text-zinc-400  max-2xl:text-[13px]">
              Created on
            </p>
            <Skeleton className="w-20 h-4" />
          </div>
          <div className="flex flex-col gap-1 flex-1 h-[64px]">
            <Skeleton className="w-full h-3" />
            <Skeleton className="w-full h-3" />
            <Skeleton className="w-full h-3" />
            <Skeleton className="w-full h-3" />
            <Skeleton className="w-1/3 h-3" />
          </div>
        </div>
      </div>

      <div className="flex w-full flex-row flex-wrap justify-start gap-1">
        <Skeleton className="flex h-7 w-24 items-center justify-start rounded-full px-3 py-1 max-2xl:px-2" />
        <Skeleton className="flex h-7 w-24 items-center justify-start rounded-full px-3 py-1 max-2xl:px-2" />
        <Skeleton className="flex h-7 w-24 items-center justify-start rounded-full px-3 py-1 max-2xl:px-2" />
      </div>
      <div className="h-1" />
    </div>
  );
};

export const CardListSkeleton = () => {
  const cardArray = Array.from({ length: 16 }, (_, index) => index);

  return (
    <div className="grid w-full gap-4 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(360px,1fr))] max-[2160px]:grid-cols-[repeat(auto-fit,minmax(360px,1fr))] min-[2160px]:grid-cols-6">
      {cardArray.map((_, index) => (
        <CardSkeleton key={index} index={index} />
      ))}
    </div>
  );
};

export const FilterByProgramsSkeleton = () => {
  const programsArray = Array.from({ length: 6 }, (_, index) => index);
  return (
    <div className="flex flex-col gap-2 w-full">
      {programsArray.map((_, index) => (
        <Skeleton key={index} className={"h-7 w-full"} />
      ))}
    </div>
  );
};

export const CommunitiesSkeleton = () => {
  // Mock 4 summary stats (same as real component)
  const summaryStats = Array(4).fill(null);
  // Mock 12 community cards for skeleton
  const communities = Array(12).fill(null);

  return (
    <div className="flex flex-col gap-8 w-full max-w-full overflow-hidden">
      {/* Page Title Skeleton */}
      <div className="flex flex-col gap-2 items-center justify-center animate-pulse">
        <div className="h-10 w-64 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        <div className="h-18 w-80 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
        <div className="h-5 w-96 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
        <div className="h-5 w-80 bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>

      {/* Summary Stats Row Skeleton - Using same Grid system */}
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
                key={`stats-skeleton-grid-${width}-${columns}`}
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

                  if (stat === undefined) return null;

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
                      <StatsSkeleton />
                    </div>
                  );
                }}
              />
            );
          }}
        </AutoSizer>
      </div>

      {/* Communities Grid Skeleton */}
      <div className="w-full overflow-hidden">
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
                key={`communities-skeleton-grid-${width}-${columns}`}
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

                  if (community === undefined) return null;

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
                      <CommunityCardSkeleton />
                    </div>
                  );
                }}
              />
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
};

export const CommunitiesLoading = () => {
  return (
    <div className="flex w-full max-w-full flex-row justify-start gap-6 px-12 pb-7 pt-5 max-2xl:px-8 max-md:px-4  max-lg:flex-col">
      <div className="flex w-full max-w-full flex-col justify-start items-center gap-6">
        <div
          className="flex h-max w-full flex-row items-center justify-start gap-3 rounded-2xl p-6 max-lg:py-4"
          style={{
            backgroundColor: "#000000",
          }}
        >
          <div className="flex justify-center border border-white rounded-full p-2">
            <Skeleton
              className={"h-14 w-14 rounded-full max-lg:h-8 max-lg:w-8"}
            />
          </div>

          <div className="flex flex-row gap-2 max-2xl:text-2xl max-lg:text-xl">
            <Skeleton className={"h-10 w-40"} />
          </div>
        </div>

        <div className="flex gap-8 flex-row max-lg:flex-col-reverse w-full">
          <div className="w-full">
            <div className="flex items-center justify-between flex-row flex-wrap-reverse max-lg:flex-wrap max-lg:flex-col-reverse max-lg:justify-start max-lg:items-start gap-3 max-lg:gap-4">
              <div className="flex flex-row gap-2 items-center">
                <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 max-2xl:text-xl font-sans">
                  Total Grants
                </p>
                <Skeleton className={"h-8 w-10"} />
                <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 max-2xl:text-xl font-sans">
                  across
                </p>
                <Skeleton className={"h-8 w-10"} />
                <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 max-2xl:text-xl font-sans">
                  projects
                </p>
              </div>
              <div className="flex items-center gap-x-3 flex-wrap gap-y-2">
                <Skeleton className={"h-10 w-20"} />
                <Skeleton className={"h-10 w-20"} />
              </div>
            </div>
            <section className="flex flex-col gap-4 md:flex-row">
              <div className="flex flex-col gap-2">
                <div className="text-base text-nowrap font-semibold text-gray-900 dark:text-zinc-100 max-2xl:text-sm mb-2 mt-5">
                  Filter by Programs
                </div>
                <FilterByProgramsSkeleton />
              </div>
              <div className="h-full w-full my-8">
                <CardListSkeleton />
              </div>
            </section>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-4/12 max-lg:w-full max-lg:hidden">
        <Skeleton className={"h-[200px] w-full"} />
        <Skeleton className={"h-[360px] w-full"} />
      </div>
    </div>
  );
};
