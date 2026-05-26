"use client";

import { TrashIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAutosyncedIndicators } from "@/hooks/useAutosyncedIndicators";
import type { ImpactIndicatorWithData } from "@/types/impactMeasurement";
import { getUnlinkedIndicators } from "@/utilities/queries/getUnlinkedIndicators";
import { cn } from "@/utilities/tailwind";
import { OutputDialog } from "./OutputDialog";
import type { CategorizedIndicator, CommunityData, OutputData } from "./types";

const useDebouncedValue = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

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

const _EmptyDiv = () => <div className="h-5 w-1" />;

const isInvalidValue = (value: number | string, unitOfMeasure: string) => {
  if (value === "") return true;
  const numValue = Number(value);
  if (unitOfMeasure === "int") {
    return !Number.isInteger(numValue);
  }
  return Number.isNaN(numValue);
};

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
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const { data: searchedUnlinked = [], isFetching } = useQuery({
    queryKey: ["unlinkedIndicators", "search", debouncedSearch],
    queryFn: () => getUnlinkedIndicators(debouncedSearch || undefined),
    enabled: isOpen,
    staleTime: 0,
    gcTime: 60 * 1000,
  });

  const communityItems = useMemo(() => {
    const communityIds = selectedCommunities.map((c) => c.uid);
    const items = indicators
      .filter(
        (ind) =>
          ind.source === "community" && ind.communityId && communityIds.includes(ind.communityId)
      )
      .map((indicator) => ({
        value: indicator.id,
        title: `${indicator.name} [${indicator.communityName || "Community"}]`,
      }));

    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter((item) => item.title.toLowerCase().includes(lower));
  }, [indicators, selectedCommunities, searchTerm]);

  const unlinkedItems = useMemo(
    () =>
      searchedUnlinked.map((indicator) => ({
        value: indicator.id,
        title: `${indicator.name} [Global]`,
      })),
    [searchedUnlinked]
  );

  const allItems = useMemo(
    () => [...communityItems, ...unlinkedItems],
    [communityItems, unlinkedItems]
  );

  const selectedLabel = useMemo(() => {
    const fromProps = indicators.find((ind) => ind.id === selected);
    if (fromProps) {
      const suffix =
        fromProps.source === "community"
          ? ` [${fromProps.communityName || "Community"}]`
          : fromProps.source === "unlinked"
            ? " [Global]"
            : "";
      return `${fromProps.name}${suffix}`;
    }
    const fromSearch = searchedUnlinked.find((ind) => ind.id === selected);
    if (fromSearch) return `${fromSearch.name} [Global]`;
    return "";
  }, [indicators, searchedUnlinked, selected]);

  const handleSelect = (value: string) => {
    onSelect(value);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleCreateNew = () => {
    onCreateNew();
    setIsOpen(false);
    setSearchTerm("");
  };

  const renderItems = (items: { value: string; title: string }[]) =>
    items.map((item) => (
      <CommandItem
        key={item.value}
        value={item.value}
        onSelect={() => handleSelect(item.value)}
        className={cn(
          "cursor-pointer",
          item.value === selected &&
            "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
        )}
      >
        {item.title}
      </CommandItem>
    ));

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setSearchTerm("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full min-w-[200px] rounded-lg border bg-white px-3 py-1.5 text-left text-sm dark:bg-zinc-800 dark:text-white truncate",
            "border-gray-200 dark:border-zinc-700",
            "data-[state=open]:border-blue-500 data-[state=open]:ring-1 data-[state=open]:ring-blue-500",
            selected ? "text-gray-900" : "text-gray-400 dark:text-zinc-500"
          )}
        >
          {selectedLabel || "Select indicator..."}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] min-w-[340px] max-w-[480px] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder="Search indicators..."
          />
          <CommandList>
            <CommandItem
              value="__create_new"
              onSelect={handleCreateNew}
              className="cursor-pointer border-b border-gray-100 font-semibold text-brand-blue dark:border-zinc-700"
            >
              + Create New Metric
            </CommandItem>
            {isFetching && allItems.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-zinc-400">Searching...</div>
            ) : allItems.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-zinc-400">
                No indicators found
              </div>
            ) : (
              <>
                {communityItems.length > 0 && (
                  <CommandGroup heading="Community">{renderItems(communityItems)}</CommandGroup>
                )}
                {unlinkedItems.length > 0 && (
                  <CommandGroup heading="Global">{renderItems(unlinkedItems)}</CommandGroup>
                )}
                {isFetching && (
                  <div className="px-3 py-1.5 text-xs text-gray-400 dark:text-zinc-500 text-center">
                    Loading...
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
  const [_selectedToCreate, setSelectedToCreate] = useState<number | undefined>(undefined);

  // Fetch auto-synced indicators from API
  const { data: autosyncedIndicators = [] } = useAutosyncedIndicators();

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
            size="xl"
            className="bg-brand-blue text-white hover:bg-brand-blue/90"
          >
            Add metric
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300 min-w-[200px]">
                  Output
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300 min-w-[400px]">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-300 min-w-[400px]">
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
                        handleOutputChange(index, "outputId", indicatorId);
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
                              "value",
                              e.target.value === "" ? "" : e.target.value
                            );
                          }
                        }}
                        placeholder={`Enter ${
                          categorizedIndicators.find((o) => o.id === output.outputId)
                            ?.unitOfMeasure === "float"
                            ? "decimal"
                            : "whole"
                        } number`}
                        disabled={
                          !!autosyncedIndicators.find(
                            (indicator) =>
                              indicator.name ===
                              indicatorsList.find((i) => i.indicatorId === output.outputId)?.name
                          )
                        }
                        className={cn(
                          "w-full px-3 py-1.5 bg-white disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-900 border rounded-md",
                          output.outputId &&
                            isInvalidValue(
                              output.value,
                              categorizedIndicators.find((o) => o.id === output.outputId)
                                ?.unitOfMeasure || "int"
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
                          {typeof output.value === "string" && output.value === ""
                            ? "This field is required"
                            : categorizedIndicators.find((o) => o.id === output.outputId)
                                  ?.unitOfMeasure === "int"
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
                          handleOutputChange(index, "proof", e.target.value);
                        }}
                        placeholder="Enter proof URL"
                        disabled={
                          !!autosyncedIndicators.find(
                            (indicator) =>
                              indicator.name ===
                              indicatorsList.find((i) => i.indicatorId === output.outputId)?.name
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

          {outputs.length > 0 && (
            <div className="flex w-full justify-end">
              <Button
                type="button"
                onClick={handleAddOutput}
                size="xl"
                className="bg-brand-blue text-white hover:bg-brand-blue/90"
              >
                Add more metrics
              </Button>
            </div>
          )}
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
