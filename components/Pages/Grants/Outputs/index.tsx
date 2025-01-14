"use client";
import { Button } from "@/components/Utilities/Button";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { useGrantStore } from "@/store/grant";
import { ProgramImpactDatapoint } from "@/types/programs";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { cn } from "@/utilities/tailwind";
import { TrashIcon } from "@heroicons/react/24/outline";
import { AreaChart, Card, Title } from "@tremor/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { prepareChartData } from "../../Admin/ProgramImpact";
import { GrantsOutputsLoading } from "../../Project/Loading/Grants/Outputs";

type OutputForm = {
  outputId: string;
  categoryId: string;
  datapoints: ProgramImpactDatapoint[];
  isEditing?: boolean;
  isSaving?: boolean;
  isEdited?: boolean;
};

interface OutputAnswers {
  id: string;
  grantUID: string;
  categoryId: string;
  categoryName: string;
  chainID: number;
  outputId: string;
  name: string;
  datapoints: ProgramImpactDatapoint[];
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

export const GrantOutputs = () => {
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );

  const isAuthorized = isProjectOwner || isContractOwner || isCommunityAdmin;

  const [outputAnswers, setOutputAnswers] = useState<OutputAnswers[]>([]);
  const [forms, setForms] = useState<OutputForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { grant } = useGrantStore();

  const handleSubmit = async (outputId: string) => {
    const form = forms.find((f) => f.outputId === outputId);
    if (!form?.datapoints?.length) {
      toast.error("Please enter a value");
      return;
    }

    setForms((prev) =>
      prev.map((f) => (f.outputId === outputId ? { ...f, isSaving: true } : f))
    );

    await sendOutputAnswers(outputId, form.categoryId, form.datapoints);

    setForms((prev) =>
      prev.map((f) =>
        f.outputId === outputId
          ? {
              ...f,
              isSaving: false,
              isEdited: false,
            }
          : f
      )
    );

    if (grant) {
      const [response] = await fetchData(INDEXER.GRANTS.OUTPUTS.GET(grant.uid));
      setOutputAnswers(response);
    }
  };

  const handleInputChange = (
    outputId: string,
    categoryId: string,
    field: "value" | "proof" | "outputTimestamp",
    value: string,
    index: number
  ) => {
    setForms((prev) =>
      prev.map((f) =>
        f.outputId === outputId
          ? {
              ...f,
              isEdited: true,
              datapoints: f.datapoints.map((datapoint, i) =>
                i === index
                  ? {
                      ...datapoint,
                      [field]: value,
                    }
                  : datapoint
              ),
            }
          : f
      )
    );
  };

  async function sendOutputAnswers(
    outputId: string,
    categoryId: string,
    datapoints: ProgramImpactDatapoint[]
  ) {
    const [response] = await fetchData(
      INDEXER.GRANTS.OUTPUTS.SEND(grant?.uid as string),
      "POST",
      {
        outputId,
        categoryId,
        outputs: datapoints,
      }
    );

    if (response?.success) {
      toast.success(MESSAGES.GRANT.OUTPUTS.SUCCESS);
      handleCancel(outputId);
    } else {
      toast.error(MESSAGES.GRANT.OUTPUTS.ERROR);
    }
  }

  async function getOutputAnswers(grantUid: string, silent = false) {
    if (!silent) setIsLoading(true);
    const [data] = await fetchData(INDEXER.GRANTS.OUTPUTS.GET(grantUid));
    const outputDataWithAnswers = data;
    setOutputAnswers(outputDataWithAnswers);

    // Initialize forms with existing values
    setForms(
      outputDataWithAnswers.map((item: any) => ({
        outputId: item.outputId,
        categoryId: item.categoryId,
        datapoints:
          item.datapoints.map((datapoint: any) => ({
            value: datapoint.value,
            proof: datapoint.proof || "",
            outputTimestamp:
              datapoint.outputTimestamp || new Date().toISOString(),
          })) || [],
        isEdited: false,
        isEditing: false,
      }))
    );

    if (!silent) setIsLoading(false);
  }
  useEffect(() => {
    if (grant) getOutputAnswers(grant.uid);
  }, [grant]);

  const handleEditClick = (outputId: string) => {
    setForms((prev) =>
      prev.map((f) => (f.outputId === outputId ? { ...f, isEditing: true } : f))
    );
  };

  const handleCancel = async (outputId: string) => {
    await getOutputAnswers(grant?.uid as string);
  };

  // Filter outputs based on authorization
  const filteredOutputs = isAuthorized
    ? outputAnswers
    : outputAnswers.filter((item) => item.datapoints?.length);

  const handleAddEntry = (outputId: string) => {
    const output = outputAnswers.find((o) => o.outputId === outputId);
    const categoryId = output?.categoryId;
    output?.datapoints.push({
      value: "",
      proof: "",
      outputTimestamp: new Date().toISOString(),
    });

    setForms((prev) =>
      prev.map((f) =>
        f.outputId === outputId
          ? {
              ...f,
              datapoints: [
                ...f.datapoints,
                {
                  value: "",
                  proof: "",
                  outputTimestamp: new Date().toISOString(),
                },
              ],
            }
          : f
      )
    );
  };

  const handleDeleteEntry = (outputId: string, index: number) => {
    const output = outputAnswers.find((o) => o.outputId === outputId);
    output?.datapoints.splice(index, 1);

    setForms((prev) =>
      prev.map((f) =>
        f.outputId === outputId
          ? {
              ...f,
              datapoints: [...f.datapoints].filter((_, i) => i !== index),
              isEdited: true,
            }
          : f
      )
    );
  };

  if (!grant || isLoading) return <GrantsOutputsLoading />;

  const isInvalidValue = (value: string) =>
    isNaN(Number(value)) || value === "";

  const isInvalidTimestamp = (outputId: string, timestamp: string) => {
    const form = forms.find((f) => f.outputId === outputId);
    const timestamps = form?.datapoints.map((dp) => dp.outputTimestamp) || [];
    return (
      timestamps.filter(
        (t) =>
          formatDate(new Date(t as string)) ===
          formatDate(new Date(timestamp as string))
      ).length > 1
    );
  };

  return (
    <div className="w-full max-w-[100rem]">
      {filteredOutputs.length > 0 ? (
        <div className="flex flex-col gap-8">
          {filteredOutputs.map((item) => {
            const form = forms.find((f) => f.outputId === item.outputId);
            const lastUpdated = filteredOutputs
              .find((subItem) => item.outputId === subItem.outputId)
              ?.datapoints?.sort(
                (a, b) =>
                  new Date(
                    b.outputTimestamp || new Date().toISOString()
                  ).getTime() -
                  new Date(
                    a.outputTimestamp || new Date().toISOString()
                  ).getTime()
              )[0]?.outputTimestamp;
            const allOutputs = filteredOutputs.find(
              (subItem) => subItem.outputId === item.outputId
            );
            const outputs = allOutputs?.datapoints.map((datapoint, index) => ({
              value: datapoint.value,
              proof: datapoint.proof,
              timestamp: datapoint.outputTimestamp || new Date().toISOString(),
            }));

            const outputsWithProof = outputs?.filter(
              (output) => output.proof && urlRegex.test(output.proof)
            );
            const lastWithProof = outputsWithProof?.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            )[0];

            const hasInvalidValues = form?.datapoints?.some((datapoint) => {
              if (!datapoint.value) return true;
              if (datapoint.value === "") return true;
              if (isNaN(Number(datapoint.value))) return true;
              return false;
            });

            const hasInvalidTimestamps = form?.datapoints?.some((datapoint) => {
              if (!datapoint.outputTimestamp) return true;

              const matchingTimestamps = form.datapoints.filter((dp) => {
                const dpDate = formatDate(
                  new Date(dp.outputTimestamp as string)
                );
                const datapointDate = formatDate(
                  new Date(datapoint.outputTimestamp as string)
                );
                return dpDate === datapointDate;
              });

              return matchingTimestamps.length > 1;
            });

            return (
              <div
                key={item.outputId}
                className="w-full flex flex-col gap-4 p-6 bg-white border border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700 rounded-md shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between flex-row flex-wrap max-md:items-start gap-4">
                  <div className="space-y-1 flex flex-col flex-1 gap-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                      {item.name}
                    </h3>
                    <div className="flex flex-row gap-2 items-center">
                      {lastWithProof?.proof &&
                      urlRegex.test(lastWithProof?.proof) ? (
                        <>
                          <Link
                            href={lastWithProof?.proof}
                            target="_blank"
                            className="underline text-sm text-brand-blue font-medium"
                          >
                            View Proof
                          </Link>
                          <div className="h-1 w-1 bg-gray-500 rounded-full" />
                        </>
                      ) : null}
                      {lastUpdated ? (
                        <span className="text-sm text-gray-500 dark:text-zinc-400">
                          Last updated {formatDate(new Date(lastUpdated), true)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-row gap-2 flex-wrap items-center">
                    <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3">
                      {item.categoryName}
                    </p>
                    <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3">
                      {item.name}
                    </p>
                    {item.type === "outcome" ? (
                      <p className="text-sm text-[#F79009] font-semibold dark:text-orange-400 bg-[#FFFAEB] dark:bg-yellow-950  rounded-2xl py-1 px-3">
                        Outcome
                      </p>
                    ) : (
                      <p className="text-sm text-[#5925DC] font-semibold dark:text-purple-400 bg-[#F4F3FF] dark:bg-purple-950 rounded-2xl py-1 px-3">
                        Output
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-row gap-4 max-md:flex-col-reverse">
                  <div className="flex flex-1">
                    <div className="w-full">
                      <div className="flex flex-col">
                        <div className="overflow-y-auto overflow-x-auto rounded">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700 rounded border border-gray-200 dark:border-zinc-700">
                            <thead className="">
                              <tr className="">
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                                  {item.name}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                                  Timestamp
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                                  Proof
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                              {item.datapoints.map((datapoint, index) => (
                                <tr key={index}>
                                  <td className="px-4 py-2">
                                    {form?.isEditing && isAuthorized ? (
                                      <input
                                        type="number"
                                        value={
                                          form?.datapoints?.[index]?.value || ""
                                        }
                                        onChange={(e) =>
                                          handleInputChange(
                                            item.outputId,
                                            item.categoryId,
                                            "value",
                                            e.target.value,
                                            index
                                          )
                                        }
                                        className={cn(
                                          "w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100",
                                          isInvalidValue(
                                            form?.datapoints?.[index]?.value ||
                                              ""
                                          )
                                            ? "border-2 border-red-500"
                                            : " border-gray-300"
                                        )}
                                      />
                                    ) : (
                                      <span className="text-gray-900 dark:text-zinc-100">
                                        {form?.datapoints?.[index]?.value || ""}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    {form?.isEditing && isAuthorized ? (
                                      <input
                                        type="date"
                                        value={
                                          form?.datapoints?.[
                                            index
                                          ]?.outputTimestamp?.split("T")[0] ||
                                          new Date().toISOString().split("T")[0]
                                        }
                                        onChange={(e) =>
                                          handleInputChange(
                                            item.outputId,
                                            item.categoryId,
                                            "outputTimestamp",
                                            e.target.value,
                                            index
                                          )
                                        }
                                        className={cn(
                                          "w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100",
                                          isInvalidTimestamp(
                                            item.outputId,
                                            form?.datapoints?.[index]
                                              ?.outputTimestamp || ""
                                          )
                                            ? "border-2 border-red-500"
                                            : " border-gray-300"
                                        )}
                                      />
                                    ) : (
                                      <span className="text-gray-900 dark:text-zinc-100">
                                        {form?.datapoints?.[index]
                                          ?.outputTimestamp
                                          ? formatDate(
                                              new Date(
                                                form.datapoints?.[index]
                                                  .outputTimestamp as string
                                              ),
                                              true
                                            )
                                          : "N/A"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    {form?.isEditing && isAuthorized ? (
                                      <input
                                        type="text"
                                        value={
                                          form?.datapoints?.[index]?.proof || ""
                                        }
                                        onChange={(e) =>
                                          handleInputChange(
                                            item.outputId,
                                            item.categoryId,
                                            "proof",
                                            e.target.value,
                                            index
                                          )
                                        }
                                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100"
                                      />
                                    ) : form?.datapoints?.[index]?.proof &&
                                      urlRegex.test(
                                        form?.datapoints?.[index]?.proof
                                      ) ? (
                                      <a
                                        href={form?.datapoints?.[index]?.proof}
                                        target="_blank"
                                        className="text-blue-500 underline dark:text-blue-400"
                                      >
                                        {form?.datapoints?.[index]?.proof ||
                                          "No proof provided"}
                                      </a>
                                    ) : (
                                      <span className="text-gray-900 dark:text-zinc-100">
                                        {form?.datapoints?.[index]?.proof ||
                                          "No proof provided"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    {form?.isEditing && isAuthorized ? (
                                      <button
                                        onClick={() =>
                                          handleDeleteEntry(
                                            item.outputId,
                                            index
                                          )
                                        }
                                      >
                                        <TrashIcon className="w-4 h-4 text-red-500" />
                                      </button>
                                    ) : null}
                                  </td>
                                </tr>
                              ))}
                              {form?.isEditing && isAuthorized && (
                                <tr>
                                  <td className="px-4 py-2">
                                    <Button
                                      onClick={() =>
                                        handleAddEntry(item.outputId)
                                      }
                                    >
                                      Add new entry
                                    </Button>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-5">
                    {item.datapoints?.length > 1 && (
                      <Card className="bg-white dark:bg-zinc-800 rounded">
                        <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-4">
                          Historical Values
                        </Title>
                        <AreaChart
                          className="h-48 mt-4"
                          data={prepareChartData(
                            item.datapoints.map((datapoint) => datapoint.value),
                            item.datapoints.map(
                              (datapoint) =>
                                datapoint.outputTimestamp ||
                                new Date().toISOString()
                            ),
                            item.name
                          )}
                          index="date"
                          categories={[item.name]}
                          colors={["blue"]}
                          valueFormatter={(value) => `${value}`}
                          showLegend={false}
                        />
                      </Card>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full justify-end">
                  {!form?.isEditing && isAuthorized && (
                    <button
                      onClick={() => handleEditClick(item.outputId)}
                      className="rounded-sm px-6 py-2 text-sm font-medium text-white bg-black dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-900/20  focus:outline-none focus:ring-2 focus:ring-zinc-500/40 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {form?.isEditing && isAuthorized && (
                    <div className="flex gap-3 pt-2 flex-row">
                      <button
                        onClick={() => handleCancel(item.outputId)}
                        disabled={form?.isSaving}
                        className="rounded-sm border border-black dark:border-zinc-100 px-6 py-2 text-sm font-medium text-black bg-white dark:bg-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-100/20  focus:outline-none focus:ring-2 focus:ring-zinc-500/40 transition-colors"
                      >
                        Cancel
                      </button>
                      <Button
                        onClick={() => handleSubmit(item.outputId)}
                        disabled={
                          form?.isSaving ||
                          !form?.isEdited ||
                          hasInvalidValues ||
                          hasInvalidTimestamps
                        }
                        className="rounded-sm px-6 py-2 text-sm cursor-pointer font-medium text-white bg-black dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-900/20  focus:outline-none focus:ring-2 focus:ring-zinc-500/40 transition-colors"
                      >
                        {form?.isSaving ? (
                          <div className="flex items-center justify-center gap-2">
                            <span>Saving...</span>
                          </div>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full text-center py-12 bg-white dark:bg-zinc-800/50 rounded-md border border-gray-200 dark:border-zinc-700">
          <p className="text-gray-600 dark:text-zinc-300">
            {MESSAGES.GRANT.OUTPUTS.EMPTY}
          </p>
        </div>
      )}
    </div>
  );
};
