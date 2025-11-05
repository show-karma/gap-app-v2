import { Skeleton } from "@/components/Utilities/Skeleton";
import { PROJECT_NAME } from "@/constants/brand";
import { layoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

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

const ProjectCardSkeleton = ({ index }: { index: number }) => {
  return (
    <div className="flex h-[240px] w-full max-w-full relative flex-col items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-2 transition-all duration-300 ease-in-out hover:opacity-80">
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
      </div>

      <div className="flex w-full flex-col flex-wrap justify-start gap-1">
        <Skeleton className="flex h-6 w-full items-center justify-start rounded-full px-3 py-1 max-2xl:px-2" />
        <Skeleton className="flex h-6 w-full items-center justify-start rounded-full px-3 py-1 max-2xl:px-2" />
      </div>
    </div>
  );
};

export const ProjectCardListSkeleton = () => {
  const cardArray = Array.from({ length: 12 }, (_, index) => index);
  return (
    <div className="grid grid-cols-4 w-full gap-4 max-[1600px]:grid-cols-4 max-[1500px]:grid-cols-3 max-[1100px]:grid-cols-2 max-sm:grid-cols-1">
      {cardArray.map((_, index) => (
        <ProjectCardSkeleton key={index} index={index} />
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

export const NewProjectsLoading = () => {
  return (
    <div className={cn(layoutTheme.padding, "flex w-full max-w-full flex-row justify-start gap-6 pb-7 pt-5 max-lg:flex-col")}>
      <div className="flex w-full max-w-full flex-col justify-start items-center gap-6 mt-4">
        <div className="flex flex-row justify-between items-center gap-3 w-full flex-wrap">
          <h1 className="text-2xl font-bold text-black dark:text-white">
            Projects on {PROJECT_NAME}
          </h1>
        </div>

        <div className="h-full w-full my-4">
          <div className="w-full flex items-center justify-center">
            <ProjectCardListSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
};
