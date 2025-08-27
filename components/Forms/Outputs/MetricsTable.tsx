"use client";

import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/solid";
import { cn } from "@/utilities/tailwind";
import { Button } from "@/components/Utilities/Button";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { ImpactIndicatorWithData } from "@/types/impactMeasurement";
import { autosyncedIndicators } from "@/components/Pages/Admin/IndicatorsHub";
// Temporarily comment out SearchWithValueDropdown to test
// import { SearchWithValueDropdown } from "@/components/Pages/Communities/Impact/SearchWithValueDropdown";
import { OutputDialog } from "./OutputDialog";
import { CategorizedIndicator, OutputData, CommunityData } from "./types";
import type { UseFormSetValue } from "react-hook-form";

interface MetricsTableProps {
  outputs: OutputData[];
  categorizedIndicators: CategorizedIndicator[];
  selectedCommunities: CommunityData[];
  indicatorsList: { indicatorId: string; name: string }[];
  selectedPrograms: { programId: string; title: string; chainID: number }[];
  onOutputsChange: (outputs: OutputData[]) => void;
  onCreateNewIndicator: (index: number) => void;
  onIndicatorCreated: (indicator: ImpactIndicatorWithData) => void;
  labelStyle: string;
}

const EmptyDiv = () => <div className="h-5 w-1" />;

const isInvalidValue = (value: number | string, unitOfMeasure: string) => {
  if (value === "") return true;
  const numValue = Number(value);
  if (unitOfMeasure === "int") {
    return !Number.isInteger(numValue);
  }
  return isNaN(numValue);
};

// CategorizedIndicatorDropdown component (extracted from ProjectUpdate.tsx)
const CategorizedIndicatorDropdown = ({
  indicators,
  onSelect,
  selected,
  onCreateNew,
  selectedCommunities,
}: {
  indicators: CategorizedIndicator[];
  onSelect: (indicatorId: string) => void;
  selected: string;
  onCreateNew: () => void;
  selectedCommunities: CommunityData[];
}) => {
  // Group indicators by source
  const projectIndicators = indicators.filter(
    (ind) => ind.source === "project"
  );
  const selectedCommunityIds = selectedCommunities.map((c) => c.uid);
  const communityIndicators = indicators.filter(
    (ind) =>
      ind.source === "community" &&
      ind.communityId &&
      selectedCommunityIds.includes(ind.communityId)
  );
  const unlinkedIndicators = indicators.filter(
    (ind) => ind.source === "unlinked"
  );

  // Create flat list with community indicators first, then unlinked indicators
  const dropdownList = [
    // Community indicators from selected communities (shown first)
    ...communityIndicators.map((indicator) => {
      const communityName = indicator.communityName || "Community";
      return {
        value: indicator.id,
        title: `${indicator.name} [${communityName}]`,
      };
    }),
    // Unlinked indicators (shown after community indicators)
    ...unlinkedIndicators.map((indicator) => ({
      value: indicator.id,
      title: `${indicator.name} [Global]`,
    })),
  ];

  return (
    <div className="flex flex-col gap-2">
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
      >
        <option value="">Select</option>
        {dropdownList.map((item) => (
          <option key={item.value} value={item.value}>
            {item.title}
          </option>
        ))}
      </select>
      <Button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCreateNew();
        }}
        className="text-sm w-full bg-zinc-700 text-white py-1.5"
      >
        Create New Metric
      </Button>
    </div>
  );
};

export const MetricsTable = ({
  outputs,
  categorizedIndicators,
  selectedCommunities,
  indicatorsList,
  selectedPrograms,
  onOutputsChange,
  onCreateNewIndicator,
  onIndicatorCreated,
  labelStyle,
}: MetricsTableProps) => {
  const [isOutputDialogOpen, setIsOutputDialogOpen] = useState(false);
  const [selectedToCreate, setSelectedToCreate] = useState<number | undefined>(undefined);

  const handleOutputChange = (index: number, field: keyof OutputData, value: any) => {
    const newOutputs = [...outputs];
    newOutputs[index] = {
      ...newOutputs[index],
      [field]: value,
    };
    onOutputsChange(newOutputs);
  };

  const handleAddOutput = () => {
    onOutputsChange([
      ...outputs,
      {
        outputId: "",
        value: 0,
        proof: "",
      },
    ]);
  };

  const handleRemoveOutput = (index: number) => {
    const newOutputs = outputs.filter((_, i) => i !== index);
    onOutputsChange(newOutputs);
  };

  const handleCreateNewIndicatorClick = (index: number) => {
    setSelectedToCreate(index);
    setIsOutputDialogOpen(true);
    onCreateNewIndicator(index);
  };

  const handleIndicatorSuccess = (newIndicator: ImpactIndicatorWithData) => {
    onIndicatorCreated(newIndicator);
    setIsOutputDialogOpen(false);
    setSelectedToCreate(undefined);
  };

  const handleIndicatorError = () => {
    setIsOutputDialogOpen(false);
    setSelectedToCreate(undefined);
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 p-6 bg-white dark:bg-zinc-800/50 border rounded-md",
        "border-gray-200 dark:border-zinc-700"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className={cn(labelStyle)}>Metrics</h3>
          <InfoTooltip content="Select from your project indicators, community indicators (created by community admins), or global indicators available to all projects. You can also create new global indicators. Metrics are quantitative data points that capture the direct results of the activity." />
        </div>
        {outputs.length > 0 && (
          <Button
            type="button"
            onClick={handleAddOutput}
            className="text-sm bg-zinc-700 text-white px-3 py-1.5"
          >
            Add more metrics
          </Button>
        )}
      </div>

      {outputs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-gray-500 dark:text-zinc-400 mb-4">
            Select from your project indicators, community indicators, or global indicators to add
            metrics
          </p>
          <Button
            type="button"
            onClick={handleAddOutput}
            className="text-sm bg-zinc-700 text-white px-3 py-1.5"
          >
            Add metric
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                  Output
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300">
                  Proof/Link
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300 w-16">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
              {outputs.map((output, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 align-top">
                    <CategorizedIndicatorDropdown
                      indicators={categorizedIndicators}
                      onSelect={(indicatorId) => {
                        handleOutputChange(index, 'outputId', indicatorId);
                      }}
                      selected={output.outputId}
                      onCreateNew={() => {
                        handleCreateNewIndicatorClick(index);
                      }}
                      selectedCommunities={selectedCommunities}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={output.value === 0 ? "" : output.value}
                        onChange={(e) => {
                          const indicator = categorizedIndicators.find(
                            (o) => o.id === output.outputId
                          );
                          const unitType = indicator?.unitOfMeasure || "int";

                          // Allow decimal point and numbers
                          const isValidInput =
                            unitType === "float"
                              ? /^-?\d*\.?\d*$/.test(e.target.value) // Allow decimals for float
                              : /^-?\d*$/.test(e.target.value); // Only integers for int

                          if (isValidInput) {
                            handleOutputChange(
                              index, 
                              'value', 
                              e.target.value === "" ? "" : e.target.value
                            );
                          }
                        }}
                        placeholder={`Enter ${
                          categorizedIndicators.find(
                            (o) => o.id === output.outputId
                          )?.unitOfMeasure === "float"
                            ? "decimal"
                            : "whole"
                        } number`}
                        disabled={
                          !!autosyncedIndicators.find(
                            (indicator) =>
                              indicator.name ===
                              indicatorsList.find(
                                (i) => i.indicatorId === output.outputId
                              )?.name
                          )
                        }
                        className={cn(
                          "w-full px-3 py-1.5 bg-white disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-900 border rounded-md",
                          output.outputId &&
                            isInvalidValue(
                              output.value,
                              categorizedIndicators.find(
                                (o) => o.id === output.outputId
                              )?.unitOfMeasure || "int"
                            )
                            ? "border-red-500 dark:border-red-500"
                            : "border-gray-300 dark:border-zinc-700"
                        )}
                      />
                      {/* Empty div to align with the "Create New Metric" button height */}
                      <div className="h-8"></div>
                    </div>
                    {output.outputId &&
                    isInvalidValue(
                      output.value,
                      categorizedIndicators.find((o) => o.id === output.outputId)
                        ?.unitOfMeasure || "int"
                    ) && (
                      <p className="text-xs text-red-500 mt-1">
                        {typeof output.value === "string" &&
                        output.value === ""
                          ? "This field is required"
                          : categorizedIndicators.find(
                              (o) => o.id === output.outputId
                            )?.unitOfMeasure === "int"
                          ? "Please enter a whole number"
                          : "Please enter a valid decimal number"}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={output.proof || ""}
                        onChange={(e) => {
                          handleOutputChange(index, 'proof', e.target.value);
                        }}
                        placeholder="Enter proof URL"
                        disabled={
                          !!autosyncedIndicators.find(
                            (indicator) =>
                              indicator.name ===
                              indicatorsList.find(
                                (i) => i.indicatorId === output.outputId
                              )?.name
                          )
                        }
                        className="w-full px-3 py-1.5 bg-white disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md"
                      />
                      {/* Empty div to align with the "Create New Metric" button height */}
                      <div className="h-8"></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-center h-9">
                        <button
                          onClick={() => handleRemoveOutput(index)}
                          type="button"
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                      {/* Empty div to align with the "Create New Metric" button height */}
                      <div className="h-8"></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <OutputDialog
        open={isOutputDialogOpen}
        onOpenChange={(open) => {
          setIsOutputDialogOpen(open);
          if (!open) {
            setSelectedToCreate(undefined);
          }
        }}
        selectedPrograms={selectedPrograms}
        onSuccess={handleIndicatorSuccess}
        onError={handleIndicatorError}
      />
    </div>
  );
};