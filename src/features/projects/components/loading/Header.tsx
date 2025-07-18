import { Skeleton } from "@/components/Utilities/Skeleton";

export default function ProjectHeaderLoading() {
  return (
    <div className="relative border-b border-gray-200 ">
      <div className="px-4 sm:px-6 lg:px-12 lg:flex py-5 lg:items-start lg:justify-between flex flex-row max-lg:flex-col max-lg:justify-center max-lg:items-center gap-4">
        <div className="flex flex-col gap-4 flex-1">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex flex-col gap-3 items-end justify-end">
          <div className="flex flex-row gap-6 max-lg:flex-col  max-lg:gap-3">
            <div className="flex flex-row gap-10 max-lg:gap-4 flex-wrap max-lg:flex-col items-center max-lg:justify-center">
              <Skeleton className="h-8 w-40" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 max-sm:px-4">
        <div className="sm:px-6 lg:px-12  sm:block">
          <Skeleton className="h-10 w-full mb-1" />
        </div>
      </div>
    </div>
  );
}
