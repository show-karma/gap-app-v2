"use client";
import { SearchGrantProgram } from "@/components/GrantProgramDropdown";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { Spinner } from "@/components/Utilities/Spinner";
import { ProgramImpactDataResponse } from "@/types/programs";
import fetchData from "@/utilities/fetchData";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { defaultMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { AreaChart, Card, Title } from "@tremor/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProgramAnalytics } from "./ProgramAnalytics";

export const prepareChartData = (
  values: number[],
  timestamps: string[],
  name: string,
  runningValues?: number[]
): { date: string; [key: string]: number | string }[] => {
  const abacaxi = timestamps
    .map((timestamp, index) => {
      if (runningValues?.length) {
        return {
          date: formatDate(new Date(timestamp), true),
          [name]: Number(values[index]) || 0,
          Running: Number(runningValues[index]) || 0,
        };
      }
      return {
        date: formatDate(new Date(timestamp), true),
        [name]: Number(values[index]) || 0,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return abacaxi;
};

export default function ProgramImpactPage() {
  const params = useParams();
  const communityId = params.communityId as string;
  const [selectedProgram, setSelectedProgram] = useState<
    GrantProgram | undefined
  >(undefined);

  const [loadingProgramImpact, setLoadingProgramImpact] =
    useState<boolean>(true); // Loading state of the API call

  // Update the state to handle grouped data
  const [programImpactData, setProgramImpactData] = useState<
    ProgramImpactDataResponse[]
  >([]);

  async function getProgramImpact() {
    setLoadingProgramImpact(true);
    try {
      if (!selectedProgram?.programId) return;
      const [data, error] = await fetchData(
        INDEXER.COMMUNITY.PROGRAM_IMPACT(communityId, selectedProgram.programId)
      );
      if (error) {
        console.error(error);
        return;
      }
      setProgramImpactData(
        data.map((item: any) => ({
          categoryName: item.categoryName,
          outputs: item.outputs.map((output: any) => ({
            ...output,
            lastUpdated: output.createdAt || output.updatedAt,
          })),
        }))
      );
    } catch (error) {
      console.error("Error fetching program impact", error);
    } finally {
      setLoadingProgramImpact(false);
    }
  }

  useEffect(() => {
    if (selectedProgram?.programId) {
      getProgramImpact();
    }
  }, [selectedProgram?.programId]);

  function reduceText(text: string, maxLength: number) {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  }

  return (
    <section className="flex flex-col w-full">
      <div className="w-full max-w-4xl">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Select a grant program to view program impact
          </h2>
          <SearchGrantProgram
            communityUID={communityId || ""}
            setSelectedProgram={setSelectedProgram}
          />
        </div>
      </div>
      {loadingProgramImpact && selectedProgram ? (
        <div className="mt-5 flex w-full items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="flex w-full flex-1 flex-col items-center gap-8">
          {programImpactData.length > 0 ? (
            <div className="w-full max-w-4xl space-y-6">
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Grant Program
                    </h3>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {programImpactData[0]?.outputs[0]?.grantTitle ||
                        selectedProgram?.metadata?.title}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total Projects
                      </h4>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {
                          new Set(
                            programImpactData.flatMap((group) =>
                              group.outputs.map((output) => output.projectUID)
                            )
                          ).size
                        }
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total Categories
                      </h4>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {programImpactData.length}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total Funding Allocated (with available data)
                      </h4>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {programImpactData
                          .reduce(
                            (acc, curr) =>
                              acc +
                              curr.outputs.reduce((acc2, curr2) => {
                                const amount = curr2.amount || "0";
                                const numericAmount = Number(
                                  amount.split(" ")[0]
                                );
                                return acc2 + (numericAmount || 0);
                              }, 0),
                            0
                          )
                          .toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {programImpactData.map((group) => (
                <div key={group.categoryName} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Category: {group.categoryName}
                    </h3>
                    <span className="px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300">
                      {group.outputs.length} projects
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.outputs.map((item) => (
                      <Card key={`${item.outputId}-${item.lastUpdated}`}>
                        <Title className="flex justify-between items-start">
                          <div>
                            <div className="flex gap-2 text-sm">
                              <span className="text-gray-500 dark:text-gray-400">
                                Grant:
                              </span>
                              <Link
                                className="underline font-bold"
                                target="_blank"
                                href={PAGES.PROJECT.GRANT(
                                  item.projectSlug,
                                  item.grantUID
                                )}
                              >
                                {item.grantTitle}
                              </Link>
                            </div>
                            <div className="flex gap-2 text-sm">
                              <span className="text-gray-500 dark:text-gray-400">
                                Project:
                              </span>
                              <Link
                                className="underline font-bold"
                                target="_blank"
                                href={PAGES.PROJECT.OVERVIEW(item.projectSlug)}
                              >
                                {reduceText(item.projectTitle, 20)}
                              </Link>
                            </div>
                            <div className="flex gap-2 text-sm">
                              <span className="text-gray-500 dark:text-gray-400">
                                Funded Amount
                              </span>
                              <span className="font-bold text-md">
                                {item.amount
                                  ? formatCurrency(
                                      Number(
                                        item.amount.includes(" ")
                                          ? item.amount.split(" ")[0]
                                          : item.amount
                                      )
                                    )
                                  : null}
                              </span>
                            </div>
                          </div>

                          <div className="font-bold text-lg">{item.name}</div>
                        </Title>
                        <AreaChart
                          data={prepareChartData(
                            item.datapoints.map((datapoint) => datapoint.value),
                            item.datapoints.map(
                              (datapoint) =>
                                datapoint.outputTimestamp ||
                                new Date().toISOString()
                            ),
                            item.name,
                            item.datapoints.map(
                              (datapoint) => datapoint.running
                            )
                          )}
                          index={"date"}
                          categories={[item.name, "Running"]}
                          colors={["blue", "green"]}
                          valueFormatter={(value) => `${value}`}
                          yAxisWidth={40}
                          noDataText="Awaiting grantees to submit values"
                        />
                      </Card>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
                  Program Analytics
                </h2>
                <ProgramAnalytics data={programImpactData} />
              </div>
            </div>
          ) : (
            <div className="w-full mb-4 max-w-4xl p-6 text-center bg-gray-50 dark:bg-zinc-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">
                {selectedProgram
                  ? "No impact data available for this program"
                  : "Select a program to view impact data"}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export const metadata = defaultMetadata;
