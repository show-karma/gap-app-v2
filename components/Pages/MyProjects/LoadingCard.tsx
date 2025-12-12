import { Skeleton } from "@/components/Utilities/Skeleton";

export const LoadingCard = () => {
  return (
    <div className="h-full dark:border-gray-900 border border-gray-200 rounded-xl pb-5 w-full transition-all ease-in-out duration-200">
      <div className="w-full flex flex-1 flex-col justify-between gap-3">
        <div className="px-2 w-full mt-2.5">
          <div className=" h-[4px] w-full rounded-full" />
        </div>

        <div className="px-5 flex flex-col gap-0">
          <div className="font-body mb-0 pb-0 text-base font-semibold text-gray-900 dark:text-gray-100">
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="font-body dark:text-slate-400 mt-1 mb-2 text-sm font-medium text-slate-500">
            <div className="flex flex-row gap-2 items-center">
              <Skeleton className="h-4 min-w-40 w-1/2" />
            </div>
          </div>
        </div>

        <div className="px-5 flex flex-col gap-1 flex-1 h-full">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>

        <div className="px-5 flex min-h-[24px] w-full flex-row gap-2 mt-4">
          <div className="flex h-7 items-center justify-start rounded-2xl bg-slate-50 px-3 py-1">
            <span className="text-center text-sm font-semibold leading-tight text-slate-600">
              <Skeleton className="h-2 w-20" />
            </span>
          </div>
          <div className="flex h-7 items-center justify-start gap-1.5 rounded-2xl bg-teal-50 py-1 pl-2.5 pr-3">
            <div className="relative h-2 w-2">
              <div className="absolute left-[1px] top-[1px] h-1.5 w-1.5 rounded-full bg-teal-600" />
            </div>
            <span className="text-center text-sm font-medium leading-tight text-teal-600">
              <Skeleton className="h-2 w-20" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
