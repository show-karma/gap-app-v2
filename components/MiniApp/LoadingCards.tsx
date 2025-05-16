import { Skeleton } from "@/components/Utilities/Skeleton";

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

const MiniAppCardSkeleton = ({ index }: { index: number }) => {
  return (
    <div className="flex h-max w-full max-w-full relative flex-col items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-2 transition-all duration-300 ease-in-out hover:opacity-80">
      <div className="w-full flex flex-col gap-1 ">
        <div
          className="h-[4px] w-full rounded-full mb-2.5"
          style={{
            background: pickColor(index),
          }}
        />

        <div className="flex w-full flex-col px-3 gap-1">
          <Skeleton className="w-full h-6" />
          <div className="flex flex-row gap-2 items-center mb-2">
            <p className="text-sm font-medium text-gray-400  dark:text-zinc-400  max-2xl:text-[13px]">
              Created on
            </p>
            <Skeleton className="w-20 h-4" />
          </div>
          <div className="flex flex-col gap-1 flex-1 h-[64px]">
            <Skeleton className="w-full h-3" />
            <Skeleton className="w-full h-3" />
            <Skeleton className="w-1/3 h-3" />
          </div>
        </div>
        <div className="flex w-full flex-row flex-wrap justify-start gap-1 px-3 mt-2">
          <Skeleton className="flex h-7 w-24 items-center justify-start rounded-full px-3 py-1 max-2xl:px-2" />
          <Skeleton className="flex h-7 w-24 items-center justify-start rounded-full px-3 py-1 max-2xl:px-2" />
          <Skeleton className="flex h-7 w-24 items-center justify-start rounded-full px-3 py-1 max-2xl:px-2" />
        </div>
      </div>
    </div>
  );
};

export const MiniAppCardListSkeleton = () => {
  const cardArray = Array.from({ length: 16 }, (_, index) => index);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full mt-2">
      {cardArray.map((_, index) => (
        <MiniAppCardSkeleton key={index} index={index} />
      ))}
    </div>
  );
};
