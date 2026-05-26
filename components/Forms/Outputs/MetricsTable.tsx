"use client";

import { TrashIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
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

  const handleSelect = useCallback(
    (value: string) => {
      onSelect(value);
      setIsOpen(false);
      setSearchTerm("");
    },
    [onSelect]
  );

  const handleCreateNew = useCallback(() => {
    onCreateNew();
    setIsOpen(false);
    setSearchTerm("");
  }, [onCreateNew]);

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
            "w-full min-w-0 rounded-lg border bg-white px-3 py-2 text-left text-sm dark:bg-zinc-800 dark:text-white truncate",
            "border-gray-200 dark:border-zinc-700",
            "data-[state=open]:border-blue-500 data-[state=open]:ring-1 data-[state=open]:ring-blue-500",
            selected ? "text-gray-900" : "text-gray-400 dark:text-zinc-500"
          )}
        >
          {selectedLabel || "Select indicator…"}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        collisionPadding={8}
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1rem)] min-w-[260px] md:min-w-[340px] md:max-w-[480px] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder="Search indicators…"
          />
          <CommandList>
            <CommandItem
              value="__create_new"
              onSelect={handleCreateNew}
              className="cursor-pointer border-b border-gray-100 font-semibold text-brand-blue dark:border-zinc-700"
            >
              + Create New Metric
            </CommandItem>
            {allItems.length === 0 ? (
              <CommandEmpty>{isFetching ? "Searching…" : "No indicators found"}</CommandEmpty>
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
                    Loading…
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
          <p className="text-gray-500 dark:text-zinc-400 mb-4 text-center">
            Select from your project indicators, community indicators, or global indicators to add
            metrics
          </p>
          <Button
            type="button"
            onClick={handleAddOutput}
            size="xl"
            className="w-full bg-brand-blue text-white hover:bg-brand-blue/90 md:w-auto"
          >
            Add metric
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div
            aria-hidden="true"
            className="hidden md:grid md:grid-cols-[minmax(200px,1.2fr)_minmax(160px,1fr)_minmax(180px,1.2fr)_auto] md:items-end md:gap-4 md:border-b md:border-gray-200 md:pb-2 md:dark:border-zinc-700"
          >
            <div className="text-sm font-bold text-gray-700 dark:text-zinc-300">Output</div>
            <div className="text-sm font-bold text-gray-700 dark:text-zinc-300">Value</div>
            <div className="text-sm font-bold text-gray-700 dark:text-zinc-300">Proof/Link</div>
            <div className="text-sm font-bold text-gray-700 dark:text-zinc-300 w-10 text-center">
              <span className="sr-only">Actions</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:divide-y md:divide-gray-200 md:gap-0 md:dark:divide-zinc-700">
            {outputs.map((output, index) => {
              const indicator = categorizedIndicators.find((o) => o.id === output.outputId);
              const unitType = indicator?.unitOfMeasure || "int";
              const isDisabled = !!autosyncedIndicators.find(
                (auto) =>
                  auto.name === indicatorsList.find((i) => i.indicatorId === output.outputId)?.name
              );
              const hasValueError = !!output.outputId && isInvalidValue(output.value, unitType);
              const valueInputId = `metric-value-${index}`;
              const proofInputId = `metric-proof-${index}`;
              const outputFieldId = `metric-output-${index}`;

              return (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-zinc-700",
                    "md:grid md:grid-cols-[minmax(200px,1.2fr)_minmax(160px,1fr)_minmax(180px,1.2fr)_auto] md:items-start md:gap-4 md:border-0 md:rounded-none md:p-0 md:py-3"
                  )}
                >
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor={outputFieldId}
                      className="text-xs font-medium text-gray-600 dark:text-zinc-400 md:hidden"
                    >
                      Output
                    </label>
                    <div id={outputFieldId}>
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
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor={valueInputId}
                      className="text-xs font-medium text-gray-600 dark:text-zinc-400 md:hidden"
                    >
                      Value
                    </label>
                    <input
                      id={valueInputId}
                      type="text"
                      inputMode={unitType === "float" ? "decimal" : "numeric"}
                      value={output.value === 0 ? "" : output.value}
                      onChange={(e) => {
                        const isValidInput =
                          unitType === "float"
                            ? /^-?\d*\.?\d*$/.test(e.target.value)
                            : /^-?\d*$/.test(e.target.value);

                        if (isValidInput) {
                          handleOutputChange(
                            index,
                            "value",
                            e.target.value === "" ? "" : e.target.value
                          );
                        }
                      }}
                      placeholder={`Enter ${unitType === "float" ? "decimal" : "whole"} number`}
                      disabled={isDisabled}
                      className={cn(
                        "w-full px-3 py-2 bg-white disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-900 border rounded-md text-sm",
                        hasValueError
                          ? "border-red-500 dark:border-red-500"
                          : "border-gray-300 dark:border-zinc-700"
                      )}
                    />
                    {hasValueError && (
                      <p className="text-xs text-red-500">
                        {typeof output.value === "string" && output.value === ""
                          ? "This field is required"
                          : unitType === "int"
                            ? "Please enter a whole number"
                            : "Please enter a valid decimal number"}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor={proofInputId}
                      className="text-xs font-medium text-gray-600 dark:text-zinc-400 md:hidden"
                    >
                      Proof / Link
                    </label>
                    <input
                      id={proofInputId}
                      type="text"
                      value={output.proof || ""}
                      onChange={(e) => {
                        handleOutputChange(index, "proof", e.target.value);
                      }}
                      placeholder="Enter proof URL"
                      disabled={isDisabled}
                      className="w-full px-3 py-2 bg-white disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md text-sm"
                    />
                  </div>

                  <div className="flex md:justify-center md:pt-1">
                    <button
                      onClick={() => handleRemoveOutput(index)}
                      type="button"
                      aria-label="Remove metric"
                      className={cn(
                        "flex w-full min-h-[44px] items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20",
                        "md:w-10 md:h-10 md:min-h-0 md:border-0 md:p-1 md:rounded-full"
                      )}
                    >
                      <TrashIcon className="h-5 w-5" />
                      <span className="md:hidden">Remove metric</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex w-full justify-end">
            <Button
              type="button"
              onClick={handleAddOutput}
              size="xl"
              className="w-full bg-brand-blue text-white hover:bg-brand-blue/90 md:w-auto"
            >
              Add more metrics
            </Button>
          </div>
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
