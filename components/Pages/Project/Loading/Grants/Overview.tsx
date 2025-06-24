import { Skeleton } from "@/components/Utilities/Skeleton";

export const ProjectGrantsOverviewLoading = () => {
  const grantData: { stat?: number | string; title: string }[] = [
    {
      stat: 1,
      title: "Total Grant Amount",
    },
    {
      stat: 1,
      title: "Start Date",
    },
    // {
    //   stat: grant?.details?.season,
    //   title: "Season",
    // },
    // {
    //   stat: grant?.details?.cycle,
    //   title: "Cycle",
    // },
  ];
  return (
    <div className="flex flex-row gap-4 w-full">
      <div className="mt-5 flex flex-row max-lg:flex-col-reverse gap-4 w-full">
        <div className="w-8/12 max-lg:w-full p-5 gap-2 bg-[#EEF4FF] dark:bg-zinc-900 dark:border-gray-800 rounded-xl  text-black dark:text-zinc-100">
          <h3 className="text-sm text-slate-600 dark:text-slate-400 uppercase font-semibold">
            GRANT DESCRIPTION
          </h3>
          <div className="mt-2 flex flex-col gap-2">
            <Skeleton className="h-6 w-full rounded-lg" />
            <Skeleton className="h-6 w-full rounded-lg" />
            <Skeleton className="h-6 w-full rounded-lg" />
            <Skeleton className="h-6 w-full rounded-lg" />
            <Skeleton className="h-6 w-1/3 rounded-lg" />
          </div>
        </div>
        <div className="w-4/12 max-lg:w-full">
          <div className="border border-gray-200 rounded-xl bg-white  dark:bg-zinc-900 dark:border-gray-800">
            <div className="flex items-center justify-between p-5">
              <div className="font-semibold text-black dark:text-white">
                Grant Overview
              </div>
              <Skeleton
                className={`h-5 items-center justify-center rounded-2xl px-2 py-1 w-24`}
              />
            </div>
            <div className="flex flex-col gap-4  px-5 pt-5 pb-5 border-t border-gray-200">
              <div className="flex items-center justify-between gap-2">
                <div className="text-gray-500 text-base  font-semibold dark:text-gray-300">
                  Community
                </div>
                <div className="inline-flex items-center gap-x-2 rounded-3xl  dark:border-gray-800 dark:text-blue-500 px-2 py-1 text-xs font-medium text-gray-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-gray-500 text-base  font-semibold dark:text-gray-300">
                  Network
                </div>
                <div className="inline-flex items-center gap-x-2 rounded-full  dark:border-gray-800 dark:text-blue-500 px-2 py-1 text-xs font-medium text-gray-900">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-gray-500  font-semibold text-base dark:text-gray-300">
                  Proposal
                </div>
                <Skeleton className="h-7 w-20 rounded-lg" />
              </div>
              {grantData.map((data) =>
                data.stat ? (
                  <div
                    key={data.title}
                    className="flex flex-row items-center justify-between gap-2"
                  >
                    <h4
                      className={
                        "text-gray-500  font-semibold text-base dark:text-gray-300"
                      }
                    >
                      {data.title}
                    </h4>
                    <div className={"text-base text-gray-900 dark:text-gray-100"}>
                      <Skeleton className="h-7 w-20 rounded-lg" />
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
