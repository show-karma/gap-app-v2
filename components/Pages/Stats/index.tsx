"use client";

import { Fragment, useEffect, useState } from "react";

import type {
  IAttestationStatsNames,
  StatChartData,
  StatPeriod,
} from "@/types";

import { LineChart } from "./LineChart";
import { WeeklyActiveUsersChart } from "./WeeklyActiveUsersChart";
import { GlobalCount } from "./GlobalCount";
import { Spinner } from "@/components/Utilities/Spinner";
import { getGAPStats } from "@/utilities/indexer/stats";
import { fillDateRangeWithValues } from "@/utilities/fillDateRangeWithValues";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import { useQueryState } from "nuqs";
import { errorManager } from "@/components/Utilities/errorManager";

// const valueFormatter = (number) =>
//   `$ ${new Intl.NumberFormat('us').format(number).toString()}`;

type DictionaryValue = {
  title: string;
  hint: string;
};
const dataNameDictionary: Record<IAttestationStatsNames, DictionaryValue> = {
  totals: { title: "Total attestations by ", hint: "Attestations" },
  projects: {
    title: "Total projects created by ",
    hint: "Projects created",
  },
  projectImpacts: {
    title: "Total projects impacts created by ",
    hint: "Project Impacts created",
  },
  projectEndorsements: {
    title: "Total projects endorsements created by ",
    hint: "Project Endorsement created",
  },
  grants: { title: "Total grants created by ", hint: "Grants created" },
  milestones: {
    title: "Total milestones created by ",
    hint: "Milestones created",
  },
  milestoneUpdates: {
    title: "Total milestone updates by ",
    hint: "Milestones updates",
  },
  grantUpdates: { title: "Total grant updates by ", hint: "Grant updates" },
  communities: {
    title: "Total communities created by ",
    hint: "Communities created",
  },
};

const allPeriods: StatPeriod[] = ["Days", "Weeks", "Months", "Years"];

export const Stats = () => {
  const [data, setData] = useState<StatChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // const [period, setPeriod] = useState<StatPeriod>("Days");

  const [period, setPeriod] = useQueryState("period", {
    shallow: false,
    defaultValue: "Days",
  });

  const getData = async () => {
    setIsLoading(true);
    try {
      const fetchedStats = await getGAPStats();
      const cleanStats = fetchedStats.filter(
        (item: { name: IAttestationStatsNames; data: any }) =>
          item.name !== "communities" && dataNameDictionary[item.name]
      );
      const filledStats = cleanStats.map((item) => {
        return {
          name: item.name,
          data: fillDateRangeWithValues(item.data),
        };
      });
      const stats = filledStats.map((item) => {
        const dataMap = item.data
          .map((dataItem) => {
            return {
              Date: formatDate(dataItem.date, "UTC"),
              [dataNameDictionary[item.name].hint]: dataItem.value,
            };
          })
          .sort(
            (a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime()
          );
        return {
          name: item.name,
          data: dataMap,
        };
      });
      setData(stats);
    } catch (error: any) {
      console.log(error);
      errorManager("Error fetching GAP stats", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <div className="mb-10 mt-4  flex w-full flex-col items-center justify-center px-12 max-xl:px-12 max-md:px-4">
      <div className="flex w-full flex-col items-center justify-center gap-8">
        <WeeklyActiveUsersChart />
        <GlobalCount />

        {isLoading ? (
          <Spinner />
        ) : (
          <>
            <div className="flex flex-row items-center gap-4">
              <h3 className="text-xl text-black">Select a period</h3>
              <Listbox
                value={period}
                onChange={(value) => {
                  setPeriod(value);
                }}
              >
                {({ open }) => (
                  <div className="flex items-center gap-x-2  max-sm:w-full max-sm:justify-between">
                    <div className="relative flex-1 w-32">
                      <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left  dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 text-gray-900  ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6">
                        <span className="block truncate">
                          {/* {sortOptions[selectedSort]} */}
                          {period}
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronUpDownIcon
                            className="h-5 w-5 text-gray-400"
                            aria-hidden="true"
                          />
                        </span>
                      </Listbox.Button>

                      <Transition
                        show={open}
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute  z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base  dark:bg-zinc-800 dark:text-zinc-200 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {allPeriods.map((item) => (
                            <Listbox.Option
                              key={item}
                              className={({ active }) =>
                                cn(
                                  active
                                    ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                                    : "text-gray-900 dark:text-gray-200 ",
                                  "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                                )
                              }
                              value={item}
                            >
                              {({ selected, active }) => (
                                <>
                                  <span
                                    className={cn(
                                      selected
                                        ? "font-semibold"
                                        : "font-normal",
                                      "block truncate"
                                    )}
                                  >
                                    {item}
                                  </span>

                                  {selected ? (
                                    <span
                                      className={cn(
                                        "text-primary-600 dark:text-primary-400",
                                        "absolute inset-y-0 right-0 flex items-center pr-4"
                                      )}
                                    >
                                      <CheckIcon
                                        className="h-5 w-5"
                                        aria-hidden="true"
                                      />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </div>
                )}
              </Listbox>
            </div>

            <div className="grid w-full max-w-7xl grid-cols-3 justify-between gap-8 max-lg:grid-cols-2 max-sm:grid-cols-1">
              {data.map((item) => (
                <LineChart
                  divStyle="flex-3 flex w-full max-h-80"
                  key={item.name}
                  title={`${
                    dataNameDictionary[item.name].title
                  } ${period.toLowerCase()}`}
                  titleProps={{
                    className: "flex flex-row gap-2 flex-wrap items-center",
                  }}
                  statChartData={item}
                  chartProps={{
                    index: "Date",
                    categories: [dataNameDictionary[item.name].hint],
                    colors: ["blue"],
                    className: "mt-6 h-[240px] max-xl:h-[200px]",
                    yAxisWidth: 48,
                  }}
                  period={period as StatPeriod}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
