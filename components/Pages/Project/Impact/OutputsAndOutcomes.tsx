"use client";

import { Button } from "@/components/Utilities/Button";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { ImpactIndicatorWithData } from "@/types/impactMeasurement";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { cn } from "@/utilities/tailwind";
import { TrashIcon } from "@heroicons/react/24/outline";
import { AreaChart, Card, Title } from "@tremor/react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { prepareChartData } from "../../Admin/ProgramImpact";
import { GrantsOutputsLoading } from "../Loading/Grants/Outputs";

type OutputForm = {
  id: string;
  categoryId: string;
  unitOfMeasure: "int" | "float";
  datapoints: {
    value: number | string;
    proof: string;
    startDate: string;
    endDate: string;
    outputTimestamp?: string;
  }[];
  isEditing?: boolean;
  isSaving?: boolean;
  isEdited?: boolean;
};

export const OutputsAndOutcomes = () => {
  const { project, isProjectOwner } = useProjectStore();

  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );

  const { isConnected } = useAccount();

  const isAuthorized =
    isConnected && (isProjectOwner || isContractOwner || isCommunityAdmin);

  const [impactAnswers, setImpactAnswers] = useState<ImpactIndicatorWithData[]>(
    []
  );
  const [forms, setForms] = useState<OutputForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleSubmit = async (id: string) => {
    const form = forms.find((f) => f.id === id);
    if (!form?.datapoints?.length) {
      toast.error("Please enter a value");
      return;
    }

    setForms((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isSaving: true } : f))
    );

    await sendImpactAnswers(id, form.datapoints);

    setForms((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              isSaving: false,
              isEdited: false,
            }
          : f
      )
    );

    if (project) {
      const [response] = await fetchData(
        INDEXER.PROJECT.IMPACT_INDICATORS.GET(project?.uid as string)
      );
      setImpactAnswers(response);
    }
  };

  const handleInputChange = (
    id: string,
    field: "value" | "proof" | "startDate" | "endDate",
    value: string,
    index: number
  ) => {
    setForms((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              isEdited: true,
              datapoints: f.datapoints.map((datapoint, i) => {
                if (i !== index) return datapoint;

                if (field === "startDate") {
                  // Prevent start date from being after end date
                  const endDate =
                    datapoint.endDate || datapoint.outputTimestamp;
                  if (endDate && value && new Date(value) > new Date(endDate)) {
                    return datapoint; // Don't update if start date would be after end date
                  }
                }

                if (field === "endDate") {
                  // Check if the new end date already exists in other datapoints
                  const newEndDate = new Date(value);
                  newEndDate.setHours(0, 0, 0, 0);

                  const existingDates = f.datapoints
                    .filter((_, dpIndex) => dpIndex !== index)
                    .map((dp) => {
                      const date = new Date(
                        dp.endDate || dp.outputTimestamp || ""
                      );
                      date.setHours(0, 0, 0, 0);
                      return date.getTime();
                    });

                  if (existingDates.includes(newEndDate.getTime())) {
                    return datapoint; // Don't update if date already exists
                  }
                }

                return {
                  ...datapoint,
                  [field]: value,
                };
              }),
            }
          : f
      )
    );
  };

  async function sendImpactAnswers(
    indicatorId: string,
    datapoints: {
      value: number | string;
      proof: string;
      startDate: string;
      endDate: string;
    }[]
  ) {
    const [, error] = await fetchData(
      INDEXER.PROJECT.IMPACT_INDICATORS.SEND(
        project?.details?.data?.slug || (project?.uid as string)
      ),
      "POST",
      {
        indicatorId,
        data: datapoints.map((item) => ({
          value: String(item.value),
          proof: item.proof,
          startDate: item.startDate,
          endDate: item.endDate,
        })),
      }
    );

    if (error) {
      toast.error(MESSAGES.GRANT.OUTPUTS.ERROR);
    } else {
      toast.success(MESSAGES.GRANT.OUTPUTS.SUCCESS);
      handleCancel();
    }
  }

  async function getImpactAnswers(projectUid: string, silent = false) {
    if (!silent) setIsLoading(true);
    const [data] = await fetchData(
      INDEXER.PROJECT.IMPACT_INDICATORS.GET(projectUid)
    );
    const outputDataWithAnswers = data;
    setImpactAnswers(outputDataWithAnswers);

    // Initialize forms with existing values
    setForms(
      outputDataWithAnswers.map((item: any) => ({
        id: item.id,
        categoryId: item.categoryId,
        datapoints:
          item.datapoints.map((datapoint: any) => ({
            value: datapoint.value,
            proof: datapoint.proof || "",
            startDate: datapoint.startDate || "",
            endDate: datapoint.endDate || datapoint.outputTimestamp || "",
            outputTimestamp: datapoint.outputTimestamp || "",
          })) || [],
        unitOfMeasure: item.unitOfMeasure,
        isEdited: false,
        isEditing: false,
      }))
    );

    if (!silent) setIsLoading(false);
  }
  useEffect(() => {
    if (project) getImpactAnswers(project.uid as string);
  }, [project]);

  const handleEditClick = (id: string) => {
    setForms((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isEditing: true } : f))
    );
  };

  const handleCancel = async () => {
    await getImpactAnswers(project?.uid as string, true);
  };

  // Filter outputs based on authorization
  const filteredOutputs = isAuthorized
    ? impactAnswers
    : impactAnswers.filter((item) => item.datapoints?.length);

  const handleAddEntry = (id: string) => {
    const output = impactAnswers.find((o) => o.id === id);
    output?.datapoints.push({
      value: 0,
      proof: "",
      startDate: "",
      endDate: "",
    });

    setForms((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              datapoints: [
                ...f.datapoints,
                {
                  value: 0,
                  proof: "",
                  startDate: new Date().toISOString(),
                  endDate: new Date().toISOString(),
                },
              ],
            }
          : f
      )
    );
  };

  const handleDeleteEntry = (id: string, index: number) => {
    const output = impactAnswers.find((o) => o.id === id);
    output?.datapoints.splice(index, 1);

    setForms((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              datapoints: [...f.datapoints].filter((_, i) => i !== index),
              isEdited: true,
            }
          : f
      )
    );
  };

  if (!project || isLoading) return <GrantsOutputsLoading />;

  const isInvalidValue = (value: number, unitOfMeasure: "int" | "float") => {
    if (value === undefined || value === null) return true;
    if (unitOfMeasure === "int") {
      return !Number.isInteger(Number(value));
    }
    return isNaN(value) || value === 0;
  };

  const isInvalidTimestamp = (id: string, timestamp: string) => {
    const form = forms.find((f) => f.id === id);
    if (!form || !timestamp) return false;

    const endDate = new Date(timestamp);
    endDate.setHours(0, 0, 0, 0); // Normalize to start of day

    const timestamps = form.datapoints
      .map((dp) => dp.endDate || dp.outputTimestamp)
      .filter(Boolean)
      .map((date) => {
        const d = new Date(date as string);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      });

    return timestamps.filter((t) => t === endDate.getTime()).length > 1;
  };

  const hasInvalidValues = (form: OutputForm) =>
    form.datapoints.some((datapoint) => {
      return isInvalidValue(Number(datapoint.value), form.unitOfMeasure);
    });

  const hasInvalidTimestamps = (form: OutputForm) =>
    form.datapoints.some((datapoint) => {
      if (!datapoint.endDate && !datapoint.outputTimestamp) return true;

      const matchingTimestamps = form.datapoints.filter((dp) => {
        const dpDate = formatDate(
          new Date(dp.endDate || dp.outputTimestamp || "")
        );
        const datapointDate = formatDate(
          new Date(datapoint.endDate || datapoint.outputTimestamp || "")
        );
        return dpDate === datapointDate;
      });

      return matchingTimestamps.length > 1;
    });

  const hasInvalidDates = (form: OutputForm) =>
    form.datapoints.some((datapoint) => {
      // Check if start date is after end date
      const endDate = datapoint.endDate || datapoint.outputTimestamp;
      if (datapoint.startDate && endDate) {
        return new Date(datapoint.startDate) > new Date(endDate);
      }
      return false;
    });

  return (
    <div className="w-full max-w-[100rem]">
      {filteredOutputs.length > 0 ? (
        <div className="flex flex-col gap-8">
          {filteredOutputs.map((item) => {
            const form = forms.find((f) => f.id === item.id);
            const lastUpdated = filteredOutputs
              .find((subItem) => item.id === subItem.id)
              ?.datapoints?.sort(
                (a, b) =>
                  new Date(b.endDate || new Date().toISOString()).getTime() -
                  new Date(a.endDate || new Date().toISOString()).getTime()
              )[0]?.endDate;
            const allOutputs = filteredOutputs.find(
              (subItem) => subItem.id === item.id
            );
            const outputs = allOutputs?.datapoints.map((datapoint, index) => ({
              value: datapoint.value,
              proof: datapoint.proof,
              timestamp: datapoint.endDate || new Date().toISOString(),
            }));

            const outputsWithProof = outputs?.filter(
              (output) => output.proof && urlRegex.test(output.proof)
            );

            return (
              <div
                key={item.id}
                className="w-full flex flex-col gap-4 p-6 bg-white border border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700 rounded-md shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between flex-row flex-wrap max-md:items-start gap-4">
                  <div className="space-y-1 flex flex-col flex-1 gap-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                      {item.description}
                    </p>
                    <div className="flex flex-row gap-2 items-center">
                      {lastUpdated ? (
                        <span className="text-sm text-gray-500 dark:text-zinc-400">
                          Last updated {formatDate(new Date(lastUpdated), true)}
                        </span>
                      ) : null}
                    </div>
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
                                  Start Date
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                                  End Date
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
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                          <input
                                            type={"number"}
                                            value={
                                              form?.datapoints?.[index]
                                                ?.value || ""
                                            }
                                            onChange={(e) =>
                                              handleInputChange(
                                                item.id,
                                                "value",
                                                e.target.value,
                                                index
                                              )
                                            }
                                            className={cn(
                                              "w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100",
                                              isInvalidValue(
                                                Number(
                                                  form?.datapoints?.[index]
                                                    ?.value
                                                ),
                                                form.unitOfMeasure
                                              )
                                                ? "border-2 border-red-500"
                                                : " border-gray-300"
                                            )}
                                          />
                                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300">
                                            {form.unitOfMeasure}
                                          </span>
                                        </div>
                                        {form?.datapoints?.[index]?.value &&
                                        isInvalidValue(
                                          Number(
                                            form?.datapoints?.[index]?.value
                                          ),
                                          form.unitOfMeasure
                                        ) ? (
                                          <span className="text-xs text-red-500">
                                            {form.unitOfMeasure === "int"
                                              ? "Please enter an integer number"
                                              : "Please enter a valid number"}
                                          </span>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <span className="text-gray-900 dark:text-zinc-100">
                                        {form?.datapoints?.[index]?.value ||
                                          "-"}
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
                                          ]?.startDate?.split("T")[0] ||
                                          new Date().toISOString().split("T")[0]
                                        }
                                        onChange={(e) =>
                                          handleInputChange(
                                            item.id,
                                            "startDate",
                                            e.target.value,
                                            index
                                          )
                                        }
                                        className={cn(
                                          "w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100"
                                        )}
                                      />
                                    ) : (
                                      <span className="text-gray-900 dark:text-zinc-100">
                                        {form?.datapoints?.[index]?.startDate
                                          ? formatDate(
                                              new Date(
                                                form.datapoints?.[
                                                  index
                                                ].startDate
                                              ),
                                              true
                                            )
                                          : "-"}
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
                                          ]?.endDate?.split("T")[0] ||
                                          form?.datapoints?.[
                                            index
                                          ]?.outputTimestamp?.split("T")[0] ||
                                          new Date().toISOString().split("T")[0]
                                        }
                                        onChange={(e) =>
                                          handleInputChange(
                                            item.id,
                                            "endDate",
                                            e.target.value,
                                            index
                                          )
                                        }
                                        className={cn(
                                          "w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100",
                                          isInvalidTimestamp(
                                            item.id,
                                            form?.datapoints?.[index]
                                              ?.endDate ||
                                              form?.datapoints?.[index]
                                                ?.outputTimestamp ||
                                              ""
                                          ) && "border-2 border-red-500"
                                        )}
                                      />
                                    ) : (
                                      <span className="text-gray-900 dark:text-zinc-100">
                                        {form?.datapoints?.[index]?.endDate
                                          ? formatDate(
                                              new Date(
                                                form.datapoints?.[index].endDate
                                              ),
                                              true
                                            )
                                          : datapoint.outputTimestamp
                                          ? formatDate(
                                              new Date(
                                                datapoint.outputTimestamp
                                              ),
                                              true
                                            )
                                          : "-"}
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
                                            item.id,
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
                                          handleDeleteEntry(item.id, index)
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
                                      onClick={() => handleAddEntry(item.id)}
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
                            item.datapoints.map((datapoint) =>
                              Number(datapoint.value)
                            ),
                            item.datapoints.map(
                              (datapoint) =>
                                datapoint.endDate || new Date().toISOString()
                            ),
                            item.name
                          )}
                          index="date"
                          categories={[item.name]}
                          colors={["blue"]}
                          valueFormatter={(value) => `${value}`}
                          showLegend={false}
                          noDataText="Awaiting grantees to submit values"
                        />
                      </Card>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full justify-end">
                  {!form?.isEditing && isAuthorized && (
                    <button
                      onClick={() => handleEditClick(item.id)}
                      className="rounded-sm px-6 py-2 text-sm font-medium text-white bg-black dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-900/20  focus:outline-none focus:ring-2 focus:ring-zinc-500/40 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {form?.isEditing && isAuthorized && (
                    <div className="flex gap-3 pt-2 flex-row">
                      <button
                        onClick={() => handleCancel()}
                        disabled={form?.isSaving}
                        className="rounded-sm border border-black dark:border-zinc-100 px-6 py-2 text-sm font-medium text-black bg-white dark:bg-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-100/20  focus:outline-none focus:ring-2 focus:ring-zinc-500/40 transition-colors"
                      >
                        Cancel
                      </button>
                      <Button
                        onClick={() => handleSubmit(item.id)}
                        disabled={
                          form?.isSaving ||
                          !form?.isEdited ||
                          (form ? hasInvalidValues(form) : false) ||
                          (form ? hasInvalidTimestamps(form) : false) ||
                          (form ? hasInvalidDates(form) : false)
                        }
                        className="rounded-sm px-6 py-2 text-sm cursor-pointer font-medium text-white bg-black dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-900/20  focus:outline-none focus:ring-2 focus:ring-zinc-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
