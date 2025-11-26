import { ChevronLeftIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/Utilities/Button";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { LoadingProgramTable } from "./Programs";
export const LoadingManagePrograms = () => {
  return (
    <section className="my-10 flex w-full max-w-full flex-col justify-between items-center gap-6 px-12 pb-7 pt-5 max-2xl:px-8 max-md:px-4">
      <div className="flex flex-row gap-2 justify-start w-full">
        <Button className="flex flex-row gap-2 bg-transparent hover:bg-transparent text-[#004EEB] text-sm p-0">
          <ChevronLeftIcon className="w-4 h-4" />
          <p className="border-b border-b-[#004EEB]">Back to Programs Explorer</p>
        </Button>
      </div>

      <div className="flex flex-row max-lg:gap-10  max-md:flex-col gap-32 justify-between w-full">
        <div className="flex flex-1 flex-col gap-3 items-start justify-start text-left">
          <h1 className="text-2xl tracking-[-0.72px] 2xl:text-3xl font-bold text-start text-black dark:text-white">
            Manage Grant Programs
          </h1>
        </div>
      </div>
      <div className="w-full">
        <div className="flex flex-wrap w-max gap-2 rounded-t bg-[#F2F4F7] dark:bg-zinc-800 px-2 py-1">
          <Button
            className="bg-transparent text-black"
            style={{
              backgroundColor: "transparent",
              color: "gray",
            }}
          >
            Waiting for approval
          </Button>
          <Button
            className="bg-transparent text-black"
            style={{
              backgroundColor: "transparent",
              color: "gray",
            }}
          >
            Approved
          </Button>
          <Button
            className="bg-transparent text-black"
            style={{
              backgroundColor: "transparent",
              color: "gray",
            }}
          >
            Rejected
          </Button>
        </div>
        <div className="sm:items-center p-3 flex max-sm:flex-col flex-row gap-3 flex-wrap justify-between rounded-b-[4px] bg-[#F2F4F7] dark:bg-zinc-900">
          <div className="w-full max-w-[450px] max-lg:max-w-xs">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <MagnifyingGlassIcon
                  className="h-5 w-5 text-black dark:text-white"
                  aria-hidden="true"
                />
              </div>
              <Skeleton className="h-9 w-full rounded-full border-0 py-1.5 pr-10 pl-3" />
            </div>
          </div>
        </div>
        <LoadingProgramTable />
      </div>
    </section>
  );
};
