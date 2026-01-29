"use client";

import { Dialog, Transition } from "@headlessui/react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { Card, Title } from "@tremor/react";
import dynamic from "next/dynamic";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { Button } from "@/components/Utilities/Button";
import { ChartSkeleton } from "@/components/Utilities/ChartSkeleton";
import { useAutosyncedIndicators } from "@/hooks/useAutosyncedIndicators";
import { useImpactAnswers } from "@/hooks/useImpactAnswers";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import type { IndicatorDatapoint, OutputForm, SelectedPointData } from "@/types/impact";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { parseProofUrls, sortIndicatorsByPriority } from "@/utilities/impact";
import { MESSAGES } from "@/utilities/messages";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { cn } from "@/utilities/tailwind";
import { prepareChartData } from "../../Communities/Impact/ImpactCharts";
import { GrantsOutputsLoading } from "../Loading/Grants/Outputs";
import { AggregatedDataSection } from "./AggregatedDataSection";
import { GroupedLinks } from "./GroupedLinks";
import { hasUniqueUsersData, UniqueUsersSection } from "./UniqueUsersSection";
import { VirtualizedDatapointsTable } from "./VirtualizedDatapointsTable";

// Dynamically import heavy Tremor chart component for bundle optimization
const AreaChart = dynamic(() => import("@tremor/react").then((mod) => mod.AreaChart), {
  ssr: false,
  loading: () => <ChartSkeleton height="h-52" />,
});

export const OutputsAndOutcomes = () => {
  const { project, isProjectOwner } = useProjectStore();

  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin);

  const { isConnected } = useAccount();

  const isAuthorized = isConnected && (isProjectOwner || isContractOwner || isCommunityAdmin);

  const [forms, setForms] = useState<OutputForm[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<{
    itemId: string;
    data: SelectedPointData;
  } | null>(null);

  // Use our custom hook for fetching impact answers
  const {
    data: impactAnswers = [],
    isLoading,
    submitImpactAnswer,
    refetch,
  } = useImpactAnswers({
    projectIdentifier: project?.uid as string,
    enabled: !!project?.uid,
  });

  // Fetch auto-synced indicators from API
  const { data: autosyncedIndicators = [] } = useAutosyncedIndicators();

  const handleSubmit = async (id: string) => {
    const form = forms.find((f) => f.id === id);
    if (!form?.datapoints?.length) {
      toast.error("Please enter a value");
      return;
    }

    setForms((prev) => prev.map((f) => (f.id === id ? { ...f, isSaving: true } : f)));

    try {
      await submitImpactAnswer({
        indicatorId: id,
        datapoints: form.datapoints,
      });

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

      handleCancel();
    } catch (_error) {
      setForms((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                isSaving: false,
                isEdited: true,
              }
            : f
        )
      );
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

  useEffect(() => {
    if (impactAnswers.length > 0) {
      // Preserve editing state for forms that already exist
      const existingForms = forms.reduce(
        (acc, form) => {
          acc[form.id] = {
            isEditing: form.isEditing || false,
            isEdited: form.isEdited || false,
          };
          return acc;
        },
        {} as Record<string, { isEditing: boolean; isEdited: boolean }>
      );

      setForms(
        impactAnswers.map((item) => ({
          id: item.id,
          categoryId: "",
          datapoints:
            item.datapoints.map((datapoint) => ({
              value: datapoint.value,
              proof: datapoint.proof || "",
              startDate: datapoint.startDate || "",
              endDate: datapoint.endDate || datapoint.outputTimestamp || "",
              outputTimestamp: datapoint.outputTimestamp || "",
            })) || [],
          unitOfMeasure:
            item.unitOfMeasure === "int" || item.unitOfMeasure === "float"
              ? item.unitOfMeasure
              : ("int" as "int" | "float"),
          isEdited: existingForms[item.id]?.isEdited || false,
          isEditing: existingForms[item.id]?.isEditing || false,
        }))
      );
    }
  }, [impactAnswers, forms.length]);

  const handleEditClick = (id: string) => {
    setForms((prev) => prev.map((f) => (f.id === id ? { ...f, isEditing: true } : f)));
  };

  const handleCancel = async () => {
    await refetch();
    setForms((prev) =>
      prev.map((form) => ({
        ...form,
        isEditing: false,
        isEdited: false,
      }))
    );
  };

  // Filter outputs based on authorization - memoized to prevent recalculation on every render
  const filteredOutputs = useMemo(
    () =>
      impactAnswers.filter(
        (item) =>
          item.isAssociatedWithPrograms ||
          item.hasData ||
          autosyncedIndicators.find((autosynced) => item.id === autosynced.id)
      ),
    [impactAnswers, autosyncedIndicators]
  );

  // Sort filtered outputs by priority - memoized to prevent recalculation on every render
  const sortedOutputs = useMemo(() => sortIndicatorsByPriority(filteredOutputs), [filteredOutputs]);

  const handleAddEntry = (id: string) => {
    // Only update local form state - don't mutate React Query cache directly
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
              isEdited: true,
            }
          : f
      )
    );
  };

  const handleDeleteEntry = (id: string, index: number) => {
    // Only update local form state - don't mutate React Query cache directly
    setForms((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              datapoints: f.datapoints.filter((_, i) => i !== index),
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
    return Number.isNaN(value) || value === 0;
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
        const dpDate = formatDate(new Date(dp.endDate || dp.outputTimestamp || ""));
        const datapointDate = formatDate(
          new Date(datapoint.endDate || datapoint.outputTimestamp || "")
        );
        return dpDate === datapointDate;
      });

      return matchingTimestamps.length > 1;
    });

  const hasInvalidDatesSameRow = (id: string, startDate: string, endDate: string) => {
    const form = forms.find((f) => f.id === id);
    if (!form) return false;
    return new Date(startDate) > new Date(endDate);
  };

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
          {sortedOutputs.map((item) => {
            const form = forms.find((f) => f.id === item.id);
            const lastUpdated = filteredOutputs
              .find((subItem) => item.id === subItem.id)
              ?.datapoints?.sort(
                (a, b) =>
                  new Date(b.endDate || new Date().toISOString()).getTime() -
                  new Date(a.endDate || new Date().toISOString()).getTime()
              )[0]?.endDate;
            const allOutputs = filteredOutputs.find((subItem) => subItem.id === item.id);
            const outputs = allOutputs?.datapoints.map((datapoint, _index) => ({
              value: datapoint.value,
              proof: datapoint.proof,
              timestamp: datapoint.endDate || new Date().toISOString(),
            }));

            const outputsWithProof = outputs?.filter(
              (output) => output.proof && urlRegex.test(output.proof)
            );

            const proofs = outputsWithProof?.map((output) => output.proof) || [];

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
                    <p className="text-sm text-gray-500 dark:text-zinc-400">{item.description}</p>
                    <div className="flex flex-row gap-2 items-center">
                      {lastUpdated ? (
                        <span className="text-sm text-gray-500 dark:text-zinc-400">
                          Last updated {formatDate(new Date(lastUpdated), "UTC")}
                        </span>
                      ) : null}
                      {autosyncedIndicators.find((i) => i.name === item.name) && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                          Auto-synced
                        </span>
                      )}
                    </div>
                    <div className="flex flex-row gap-2 items-center flex-wrap">
                      <GroupedLinks proofs={proofs} />
                    </div>
                  </div>
                </div>
                {/* Aggregated Data Section - same layout as Historical Values */}
                {item.aggregatedData && Object.keys(item.aggregatedData).length > 0 && (
                  <AggregatedDataSection
                    aggregatedData={item.aggregatedData}
                    indicatorName={item.name}
                    maxItems={10}
                    rawDatapoints={item.datapoints?.map((dp: IndicatorDatapoint) => ({
                      value: dp.value,
                      breakdown: dp.breakdown,
                      startDate: dp.startDate,
                      endDate: dp.endDate,
                    }))}
                  />
                )}

                {/* Unique Users Section - for indicators with period-based data (30d, 90d, 180d, 1y, monthly) */}
                {item.datapoints &&
                  hasUniqueUsersData(
                    item.datapoints.map((dp: IndicatorDatapoint) => ({
                      value: dp.value,
                      breakdown: dp.breakdown,
                      period: dp.period,
                      startDate: dp.startDate,
                      endDate: dp.endDate,
                      proof: dp.proof,
                    }))
                  ) && (
                    <UniqueUsersSection
                      datapoints={item.datapoints.map((dp: IndicatorDatapoint) => ({
                        value: dp.value,
                        breakdown: dp.breakdown,
                        period: dp.period,
                        startDate: dp.startDate,
                        endDate: dp.endDate,
                        proof: dp.proof,
                      }))}
                      indicatorName={item.name}
                    />
                  )}

                <div className="flex flex-row gap-4 max-md:flex-col-reverse">
                  <div className="flex flex-1 flex-col gap-5">
                    {/* Raw Historical Values Chart */}
                    {item.datapoints?.length > 1 ? (
                      <Card className="bg-white dark:bg-zinc-800 rounded h-full">
                        <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-4">
                          Historical Values
                        </Title>
                        <div className="relative">
                          <AreaChart
                            className="h-52 mt-4"
                            data={prepareChartData(
                              item.datapoints.map((datapoint: IndicatorDatapoint) =>
                                Number(datapoint.value)
                              ),
                              item.datapoints.map(
                                (datapoint: IndicatorDatapoint) =>
                                  datapoint.endDate || new Date().toISOString()
                              ),
                              item.name,
                              undefined,
                              item.datapoints.map(
                                (datapoint: IndicatorDatapoint) => datapoint.proof
                              )
                            )}
                            index="date"
                            categories={[item.name]}
                            colors={["blue"]}
                            valueFormatter={(value) => `${formatCurrency(value)}`}
                            showLegend={false}
                            noDataText="Awaiting grantees to submit values"
                            onValueChange={(v) => {
                              if (!v) {
                                return;
                              }

                              const selectedItem = filteredOutputs.find((i) => i.id === item.id);
                              if (!selectedItem) {
                                return;
                              }

                              // Find the exact datapoint that matches this date and value
                              const exactDatapoint = item.datapoints.find(
                                (dp: IndicatorDatapoint) => {
                                  const dpDate = formatDate(
                                    new Date(dp.endDate || new Date().toISOString()),
                                    "UTC"
                                  );
                                  return (
                                    dpDate === v.date &&
                                    Number(dp.value) === Number(v[selectedItem.name])
                                  );
                                }
                              );

                              setSelectedPoint({
                                itemId: item.id,
                                data: {
                                  value: v[selectedItem.name],
                                  date: v.date,
                                  proof: exactDatapoint?.proof || (v.proof as string | undefined),
                                },
                              });
                            }}
                          />
                        </div>
                      </Card>
                    ) : (
                      <p className="text-gray-600 dark:text-zinc-300 text-left">
                        {MESSAGES.GRANT.OUTPUTS.EMPTY_DATAPOINTS}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-1 w-full">
                    <div className="w-full flex flex-col flex-1">
                      {(() => {
                        const isAutosynced = autosyncedIndicators.find((i) => i.name === item.name);
                        const displayTable =
                          (!isAutosynced && item.hasData) || (!isAutosynced && form?.isEditing);
                        return displayTable;
                      })() ? (
                        <div className="bg-white dark:bg-zinc-800 rounded h-full flex flex-col flex-1">
                          <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-4">
                            Breakdown
                          </Title>
                          {/* Use virtualized table for editing mode with many datapoints (20+) */}
                          {form?.isEditing && form.datapoints.length >= 20 ? (
                            <VirtualizedDatapointsTable
                              itemId={item.id}
                              itemName={item.name}
                              form={form}
                              isAuthorized={isAuthorized}
                              isAutosynced={
                                !!autosyncedIndicators.find((i) => i.name === item.name)
                              }
                              onInputChange={handleInputChange}
                              onDeleteEntry={handleDeleteEntry}
                              onAddEntry={handleAddEntry}
                              isInvalidValue={isInvalidValue}
                              isInvalidTimestamp={isInvalidTimestamp}
                              hasInvalidDatesSameRow={hasInvalidDatesSameRow}
                            />
                          ) : form?.isEditing && isAuthorized ? (
                            /* Card-based layout for edit mode */
                            <div className="flex flex-col gap-3 overflow-y-auto max-h-80">
                              {form.datapoints.map((datapoint, index: number) => (
                                <div
                                  key={`${datapoint.endDate || ""}-${datapoint.value || ""}-${index}`}
                                  className="p-4 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50"
                                >
                                  {/* Row 1: Value + Proof + Delete */}
                                  <div className="flex gap-3 items-start">
                                    {/* Value input */}
                                    <label className="flex-1 block">
                                      <span className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                                        {item.name}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          value={datapoint.value || ""}
                                          onChange={(e) =>
                                            handleInputChange(
                                              item.id,
                                              "value",
                                              e.target.value,
                                              index
                                            )
                                          }
                                          aria-invalid={isInvalidValue(
                                            Number(datapoint.value),
                                            form.unitOfMeasure || "int"
                                          )}
                                          className={cn(
                                            "w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:outline-none dark:text-zinc-100",
                                            isInvalidValue(
                                              Number(datapoint.value),
                                              form.unitOfMeasure || "int"
                                            )
                                              ? "border-2 border-red-500"
                                              : "border-gray-300 dark:border-zinc-700"
                                          )}
                                        />
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 whitespace-nowrap">
                                          {form.unitOfMeasure || ""}
                                        </span>
                                      </div>
                                      {datapoint.value &&
                                        isInvalidValue(
                                          Number(datapoint.value),
                                          form.unitOfMeasure || "int"
                                        ) && (
                                          <span className="text-xs text-red-500 mt-1">
                                            {form.unitOfMeasure === "int"
                                              ? "Please enter an integer"
                                              : "Please enter a valid number"}
                                          </span>
                                        )}
                                    </label>
                                    {/* Proof input */}
                                    <label className="flex-[2] block">
                                      <span className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                                        Proof
                                      </span>
                                      <input
                                        type="text"
                                        value={datapoint.proof || ""}
                                        onChange={(e) =>
                                          handleInputChange(item.id, "proof", e.target.value, index)
                                        }
                                        placeholder="Enter proof URL"
                                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:outline-none dark:text-zinc-100"
                                      />
                                    </label>
                                    {/* Delete button */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEntry(item.id, index)}
                                      aria-label={`Delete entry ${index + 1}`}
                                      className="mt-6 p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                    >
                                      <TrashIcon
                                        className="w-4 h-4 text-red-500"
                                        aria-hidden="true"
                                      />
                                    </button>
                                  </div>
                                  {/* Row 2: Start Date + End Date */}
                                  <div className="flex gap-3 mt-3">
                                    <label className="flex-1 block">
                                      <span className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                                        Start Date
                                      </span>
                                      <input
                                        type="date"
                                        value={
                                          datapoint.startDate?.split("T")[0] ||
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
                                        aria-invalid={hasInvalidDatesSameRow(
                                          item.id,
                                          datapoint.startDate,
                                          datapoint.endDate
                                        )}
                                        className={cn(
                                          "w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:outline-none dark:text-zinc-100",
                                          hasInvalidDatesSameRow(
                                            item.id,
                                            datapoint.startDate,
                                            datapoint.endDate
                                          )
                                            ? "border-2 border-red-500"
                                            : "border-gray-300 dark:border-zinc-700"
                                        )}
                                      />
                                    </label>
                                    <label className="flex-1 block">
                                      <span className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                                        End Date
                                      </span>
                                      <input
                                        type="date"
                                        value={
                                          datapoint.endDate?.split("T")[0] ||
                                          datapoint.outputTimestamp?.split("T")[0] ||
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
                                        aria-invalid={
                                          isInvalidTimestamp(
                                            item.id,
                                            datapoint.endDate || datapoint.outputTimestamp || ""
                                          ) ||
                                          hasInvalidDatesSameRow(
                                            item.id,
                                            datapoint.startDate,
                                            datapoint.endDate
                                          )
                                        }
                                        className={cn(
                                          "w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:outline-none dark:text-zinc-100",
                                          (isInvalidTimestamp(
                                            item.id,
                                            datapoint.endDate || datapoint.outputTimestamp || ""
                                          ) ||
                                            hasInvalidDatesSameRow(
                                              item.id,
                                              datapoint.startDate,
                                              datapoint.endDate
                                            )) &&
                                            "border-2 border-red-500"
                                        )}
                                      />
                                    </label>
                                  </div>
                                </div>
                              ))}
                              <Button onClick={() => handleAddEntry(item.id)} className="w-fit">
                                Add new entry
                              </Button>
                            </div>
                          ) : (
                            /* Table for read-only mode */
                            <div className="overflow-y-auto overflow-x-auto max-h-80 rounded border border-gray-200 dark:border-zinc-700">
                              <table
                                className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700"
                                aria-label={`${item.name} data entries breakdown`}
                              >
                                <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0">
                                  <tr>
                                    <th
                                      scope="col"
                                      className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400"
                                    >
                                      {item.name}
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400"
                                    >
                                      Start Date
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400"
                                    >
                                      End Date
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400"
                                    >
                                      Proof
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                  {item.datapoints.slice(0, 10).map((datapoint, index: number) => (
                                    <tr
                                      key={`${datapoint.endDate || ""}-${datapoint.value || ""}-${index}`}
                                    >
                                      <td className="px-4 py-2">
                                        <span className="text-gray-900 dark:text-zinc-100">
                                          {form?.datapoints?.[index]?.value ||
                                            datapoint.value ||
                                            "-"}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2">
                                        <span className="text-gray-900 dark:text-zinc-100">
                                          {datapoint.startDate
                                            ? formatDate(new Date(datapoint.startDate), "UTC")
                                            : "-"}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2">
                                        <span className="text-gray-900 dark:text-zinc-100">
                                          {datapoint.endDate
                                            ? formatDate(new Date(datapoint.endDate), "UTC")
                                            : datapoint.outputTimestamp
                                              ? formatDate(
                                                  new Date(datapoint.outputTimestamp),
                                                  "UTC"
                                                )
                                              : "-"}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2">
                                        {datapoint.proof ? (
                                          <div className="flex flex-col gap-1">
                                            {parseProofUrls(datapoint.proof).length > 0 ? (
                                              parseProofUrls(datapoint.proof).map(
                                                (url, urlIndex) => (
                                                  <a
                                                    key={urlIndex}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 underline dark:text-blue-400 truncate max-w-xs"
                                                  >
                                                    {url}
                                                  </a>
                                                )
                                              )
                                            ) : (
                                              <span className="text-gray-900 dark:text-zinc-100">
                                                {datapoint.proof}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-gray-900 dark:text-zinc-100">
                                            No proof provided
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {!form?.isEditing && item.datapoints.length > 10 && (
                            <p className="text-xs text-gray-400 dark:text-zinc-600 mt-2 text-center">
                              Showing 10 of {item.datapoints.length} entries
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full justify-end">
                  {!autosyncedIndicators.find((i) => i.name === item.name) &&
                    !form?.isEditing &&
                    isAuthorized && (
                      <button
                        type="button"
                        onClick={() => handleEditClick(item.id)}
                        aria-label={`Edit ${item.name} data`}
                        className="rounded-sm px-6 py-2 text-sm font-medium text-white bg-black dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-900/20 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  {form?.isEditing && isAuthorized && (
                    <fieldset
                      aria-label="Form actions"
                      className="flex gap-3 pt-2 flex-row border-0 m-0 p-0"
                    >
                      <button
                        type="button"
                        onClick={() => handleCancel()}
                        disabled={form?.isSaving}
                        aria-label="Cancel editing"
                        className="rounded-sm border border-black dark:border-zinc-100 px-6 py-2 text-sm font-medium text-black bg-white dark:bg-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-100/20 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 transition-colors"
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
                        aria-label={
                          form?.isSaving ? "Saving changes" : `Save changes for ${item.name}`
                        }
                        aria-busy={form?.isSaving}
                        className="rounded-sm px-6 py-2 text-sm cursor-pointer font-medium text-white bg-black dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-900/20 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {form?.isSaving ? (
                          <div className="flex items-center justify-center gap-2">
                            <span>Saving...</span>
                          </div>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </fieldset>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full text-center py-12 bg-white dark:bg-zinc-800/50 rounded-md border border-gray-200 dark:border-zinc-700">
          <p className="text-gray-600 dark:text-zinc-300">{MESSAGES.GRANT.OUTPUTS.EMPTY}</p>
        </div>
      )}

      {/* Modal - Using Headless UI Dialog for proper accessibility focus management */}
      <Transition appear show={selectedPoint !== null} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setSelectedPoint(null)}>
          {/* Backdrop with transition */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70" aria-hidden="true" />
          </Transition.Child>

          {/* Modal content container */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold text-gray-900 dark:text-zinc-100"
                      >
                        Data Point Details
                      </Dialog.Title>
                      <button
                        type="button"
                        onClick={() => setSelectedPoint(null)}
                        aria-label="Close data point details"
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                      >
                        <span className="text-2xl" aria-hidden="true">
                          ×
                        </span>
                      </button>
                    </div>

                    {selectedPoint && (
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                            Value
                          </div>
                          <p className="text-base text-gray-900 dark:text-zinc-100">
                            {selectedPoint.data.value}
                          </p>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                            Date
                          </div>
                          <p className="text-base text-gray-900 dark:text-zinc-100">
                            {selectedPoint.data.date}
                          </p>
                        </div>

                        {selectedPoint.data.proof && (
                          <div>
                            <div className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                              Proof
                            </div>
                            <div className="mt-1 flex flex-col gap-2">
                              {parseProofUrls(selectedPoint.data.proof).length > 0 ? (
                                parseProofUrls(selectedPoint.data.proof).map((url, index) => (
                                  <a
                                    key={index}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:hover:bg-blue-500 transition-colors"
                                  >
                                    View Proof{" "}
                                    {parseProofUrls(selectedPoint.data.proof).length > 1
                                      ? `#${index + 1}`
                                      : ""}
                                  </a>
                                ))
                              ) : (
                                <span className="text-gray-500 dark:text-zinc-400">
                                  {selectedPoint.data.proof}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};
