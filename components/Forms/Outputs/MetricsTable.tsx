"use client";

import { TrashIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/Utilities/Button";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
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

// CategorizedIndicatorDropdown component with debounced API search
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 340,
  });
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  // Fetch unlinked indicators from API with debounced search
  const { data: searchedUnlinked = [], isFetching } = useQuery({
    queryKey: ["unlinkedIndicators", "search", debouncedSearch],
    queryFn: () => getUnlinkedIndicators(debouncedSearch || undefined),
    enabled: isOpen,
    staleTime: 0, // Always refetch so newly created indicators appear
    gcTime: 60 * 1000,
  });

  // Position the portal panel below the trigger button
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(340, rect.width),
      });
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchTerm("");
  }, []);

  // Close dropdown on outside click (check both trigger and portal panel)
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      handleClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, handleClose]);

  // Close on resize; close on scroll only if outside the panel
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      handleClose();
    };
    window.addEventListener("resize", handleClose);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", handleClose);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, handleClose]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Community indicators (client-side filtered)
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

  // Unlinked indicators (from API search)
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

  // For the selected label, look in both the passed-in indicators and the API results
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
    return null;
  }, [indicators, searchedUnlinked, selected]);

  const handleSelect = useCallback(
    (value: string) => {
      onSelect(value);
      setIsOpen(false);
      setSearchTerm("");
    },
    [onSelect]
  );

  const renderItem = useCallback(
    (item: { value: string; title: string }) => (
      <button
        type="button"
        key={item.value}
        role="option"
        aria-selected={item.value === selected}
        onClick={() => handleSelect(item.value)}
        className={cn(
          "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-700",
          item.value === selected
            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
            : "text-gray-900 dark:text-white"
        )}
      >
        {item.title}
      </button>
    ),
    [selected, handleSelect]
  );

  const dropdownPanel = isOpen
    ? createPortal(
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: panelPos.top,
            left: panelPos.left,
            width: panelPos.width,
            maxWidth: 480,
            zIndex: 9999,
          }}
          className="rounded-lg border border-gray-200 bg-white shadow-lg dark:bg-zinc-800 dark:border-zinc-700"
        >
          <div className="p-2 border-b border-gray-100 dark:border-zinc-700">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleClose();
              }}
              placeholder="Search indicators..."
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:bg-zinc-900 dark:border-zinc-600 dark:text-white dark:placeholder-zinc-500"
            />
          </div>

          <div className="max-h-60 overflow-y-auto py-1" role="listbox">
            <button
              type="button"
              onClick={() => {
                onCreateNew();
                setIsOpen(false);
                setSearchTerm("");
              }}
              className="w-full px-3 py-2 text-left text-sm font-semibold text-brand-blue hover:bg-gray-100 dark:hover:bg-zinc-700"
            >
              + Create New Metric
            </button>

            {isFetching && allItems.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-zinc-400">Searching...</div>
            ) : allItems.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-zinc-400">
                No indicators found
              </div>
            ) : (
              <>
                {communityItems.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                      Community
                    </div>
                    {communityItems.map(renderItem)}
                  </>
                )}
                {unlinkedItems.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                      Global
                    </div>
                    {unlinkedItems.map(renderItem)}
                  </>
                )}
                {isFetching && (
                  <div className="px-3 py-1.5 text-xs text-gray-400 dark:text-zinc-500 text-center">
                    Loading...
                  </div>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="min-w-[200px]">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-full rounded-lg border bg-white px-3 py-1.5 text-left text-sm dark:bg-zinc-800 dark:text-white truncate",
          isOpen ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200 dark:border-zinc-700",
          selected ? "text-gray-900" : "text-gray-400 dark:text-zinc-500"
        )}
      >
        {selectedLabel || "Select indicator..."}
      </button>
      {dropdownPanel}
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
            className="text-sm bg-brand-blue text-white px-3 py-1.5"
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
                className="text-sm bg-brand-blue text-white px-3 py-1.5"
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
