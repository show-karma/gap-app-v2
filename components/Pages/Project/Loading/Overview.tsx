import { Skeleton } from "@/components/Utilities/Skeleton"

export const ProjectOverviewLoading = () => {
  const Team = () => {
    // empty array of 3 elements
    const members = Array(3).fill({})
    return (
      <div className="flex flex-col gap-2 w-full min-w-48">
        <div className="font-semibold text-black dark:text-white leading-none">Team</div>
        <div className="flex flex-col divide-y divide-y-zinc-200 border border-zinc-200 rounded-xl">
          {members?.map((_member, index) => (
            <div key={index} className="flex items-center flex-row gap-3 p-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-40" />

                <div className="flex flex-row gap-2 justify-between items-center w-full max-w-max">
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const _ProjectBlocks = () => {
    return (
      <>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </>
    )
  }

  return (
    <div className="flex flex-row max-lg:flex-col gap-6 max-md:gap-4 py-5 mb-20">
      <div className="flex flex-[2.5] gap-6 flex-col w-full max-lg:hidden">
        <Team />
      </div>
      <div className="flex flex-col flex-[7.5] max-lg:w-full gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
      <div className="flex flex-col flex-[4] gap-8 max-lg:w-full">
        <div className="flex w-full flex-col gap-2 lg:hidden">
          <Team />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-black dark:text-zinc-400 font-bold text-sm">Project impact</p>
          <div className="flex flex-row  max-lg:flex-col gap-4">
            <div className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center">
              <div className="flex flex-col gap-2">
                <Skeleton className="rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px] min-w-[40px] w-max h-max" />
                <div className="flex flex-row gap-2 items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center">
              <div className="flex flex-col gap-2">
                <Skeleton className="rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px] min-w-[40px] w-max h-max" />
                <div className="flex flex-row gap-2 items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center">
              <div className="flex flex-col gap-2">
                <Skeleton className="rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px] min-w-[40px] w-max h-max" />
                <div className="flex flex-row gap-2 items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-black dark:text-zinc-400 font-bold text-sm">
            This project has received
          </p>
          <div className="flex flex-row  max-lg:flex-col gap-4">
            <div className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center">
              <div className="flex flex-col gap-2">
                <Skeleton className="rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px] min-w-[40px] w-max h-max" />
                <div className="flex flex-row gap-2 items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center">
              <div className="flex flex-col gap-2">
                <Skeleton className="rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px] min-w-[40px] w-max h-max" />
                <div className="flex flex-row gap-2 items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full max-lg:hidden">
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="flex w-full">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}
