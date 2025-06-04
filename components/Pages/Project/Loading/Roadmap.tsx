import { Skeleton } from "@/components/Utilities/Skeleton";

const CardSkeleton = () => {
  return (
    <div
      className={`border border-gray-300 dark:border-zinc-400 bg-white dark:bg-zinc-800 rounded-xl p-6 gap-3 flex flex-col items-start justify-start`}
    >
      <div className="flex flex-row gap-3 items-start justify-between w-full">
        <div className="flex flex-row gap-3 items-center max-lg:flex-col-reverse max-lg:items-start max-lg:gap-2 w-full">
          <Skeleton className="w-1/3 h-10  pl-4 border-l-4 border-l-gray-300" />

          <Skeleton className="w-20 h-6 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-1 w-full">
        <Skeleton className="w-full h-5" />
        <Skeleton className="w-full h-5" />
        <Skeleton className="w-full h-5" />
        <Skeleton className="w-1/3 h-5" />
      </div>
      <div className="flex flex-row gap-x-4 gap-y-2 items-center justify-between w-full flex-wrap">
        <div className="flex flex-row gap-2 items-center flex-wrap">
          <div className="text-zinc-800 dark:text-zinc-300 text-sm lg:text-base">
            <Skeleton className="w-64 h-6" />
          </div>
        </div>
        <Skeleton className="w-20 h-8 rounded-full" />
      </div>
    </div>
  );
};

export const RoadmapListLoading = () => {
  const emptyArray = Array.from({ length: 5 }, (_, index) => index);
  return (
    <div className="flex w-full flex-col gap-6 px-6 py-10 bg-[#F9FAFB] dark:bg-zinc-900 rounded-xl max-lg:px-2 max-lg:py-4">
      {emptyArray.map((item) => (
        <CardSkeleton key={item} />
      ))}
    </div>
  );
};

export const ProjectRoadmapLoading = () => {
  return (
    <div className="flex flex-col w-full h-full items-center justify-start">
      <div className="flex flex-col gap-2 py-11 items-center justify-start w-full max-w-full max-lg:py-6">
        <div className="py-5 w-full items-center flex flex-row justify-between gap-4 max-lg:flex-col max-lg:items-start max-lg:py-0">
          <div className="flex flex-col gap-1 items-start justify-start w-full">
            <div className="flex flex-row gap-2">
              <Skeleton className="h-10 w-40" />
            </div>
            <div className="flex flex-row gap-2 items-center justify-start max-lg:flex-col max-lg:items-start max-lg:justify-center max-lg:gap-1">
              <Skeleton className="h-5 w-64 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="py-6 w-full">
          <RoadmapListLoading />
        </div>
      </div>
    </div>
  );
};
