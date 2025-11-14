import { Button } from "@/components/Utilities/Button"
import { Skeleton } from "@/components/Utilities/Skeleton"

interface TabButtonProps {
  tabName: string
}
const TabButton = ({ tabName }: TabButtonProps) => {
  return (
    <Button
      className={
        "flex flex-row my-0.5 text-gray-500 items-center gap-2 bg-transparent px-2 py-1 font-medium hover:bg-white hover:text-black max-sm:text-sm"
      }
    >
      {tabName}
      <Skeleton className="rounded-full px-2.5 w-5 h-5" />
    </Button>
  )
}

const MilestoneCard = () => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-full flex-1 flex-col rounded-lg border border-zinc-200 bg-white dark:bg-zinc-800 transition-all duration-200 ease-in-out">
        <div className="flex w-full flex-col py-4">
          <div className="flex w-full flex-row items-start justify-between px-4 max-lg:mb-4 max-lg:flex-col">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="flex flex-row items-center justify-start gap-2">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          <div className="flex flex-col gap-2 px-4 mt-2 pb-3 max-lg:max-w-xl max-sm:max-w-[300px]">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        </div>
      </div>
    </div>
  )
}

export const ProjectGrantsMilestonesListLoading = () => {
  const emptyArray = Array.from({ length: 6 }, () => ({}))
  return (
    <div className="mt-3 flex w-full flex-col gap-6">
      {emptyArray.map((_item, index) => (
        <div key={index}>
          <MilestoneCard />
        </div>
      ))}
    </div>
  )
}

export const ProjectGrantsMilestonesAndUpdatesLoading = () => {
  return (
    <div className="w-full">
      <div className="space-y-5">
        <div className="flex flex-1 flex-col gap-4">
          <div className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-3">
                <div className=" flex flex-col items-start justify-start gap-0 ">
                  <div className="flex w-full flex-row flex-wrap items-center justify-between gap-4 py-3">
                    <div className="flex w-max flex-row flex-wrap items-center  gap-4 max-sm:flex-col max-sm:items-start max-sm:justify-start">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-200">
                        MILESTONES
                      </p>
                      <div className="flex flex-row flex-wrap gap-2 rounded bg-[#F2F4F7] dark:bg-zinc-800 px-2 py-1">
                        <TabButton tabName="Completed" />
                        <TabButton tabName="Pending" />
                        <TabButton tabName="All" />
                      </div>
                    </div>
                    <div className="flex flex-row flex-wrap gap-5">
                      <Skeleton className="h-6 w-48" />
                    </div>
                  </div>

                  <ProjectGrantsMilestonesListLoading />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
