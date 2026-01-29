"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/Utilities/Button";
import type { OutputForm } from "@/types/impact";
import { formatDate } from "@/utilities/formatDate";
import { parseProofUrls } from "@/utilities/impact";
import { cn } from "@/utilities/tailwind";

interface DatapointFormData {
  value: number | string;
  proof: string;
  startDate: string;
  endDate: string;
  outputTimestamp?: string;
}

interface VirtualizedDatapointsTableProps {
  itemId: string;
  itemName: string;
  form: OutputForm;
  isAuthorized: boolean;
  isAutosynced: boolean;
  onInputChange: (
    id: string,
    field: "value" | "proof" | "startDate" | "endDate",
    value: string,
    index: number
  ) => void;
  onDeleteEntry: (id: string, index: number) => void;
  onAddEntry: (id: string) => void;
  isInvalidValue: (value: number, unitOfMeasure: "int" | "float") => boolean;
  isInvalidTimestamp: (id: string, timestamp: string) => boolean;
  hasInvalidDatesSameRow: (id: string, startDate: string, endDate: string) => boolean;
  scrollToIndex?: number;
}

const ROW_HEIGHT = 56; // Estimated row height in pixels
const OVERSCAN_COUNT = 5; // Number of items to render outside of visible area

export const VirtualizedDatapointsTable = ({
  itemId,
  itemName,
  form,
  isAuthorized,
  isAutosynced,
  onInputChange,
  onDeleteEntry,
  onAddEntry,
  isInvalidValue,
  isInvalidTimestamp,
  hasInvalidDatesSameRow,
  scrollToIndex,
}: VirtualizedDatapointsTableProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const datapoints = form.datapoints;

  const rowVirtualizer = useVirtualizer({
    count: datapoints.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => ROW_HEIGHT, []),
    overscan: OVERSCAN_COUNT,
  });

  // Scroll to a specific row when scrollToIndex changes
  useEffect(() => {
    if (scrollToIndex !== undefined && scrollToIndex >= 0 && scrollToIndex < datapoints.length) {
      rowVirtualizer.scrollToIndex(scrollToIndex, { align: "center", behavior: "smooth" });
    }
  }, [scrollToIndex, rowVirtualizer, datapoints.length]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  const renderRowContent = (index: number, datapoint: DatapointFormData) => {
    return (
      <>
        {/* Value Column */}
        <div className="px-4 py-2 flex-1 min-w-[150px]">
          {!isAutosynced && form.isEditing ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={datapoint.value || ""}
                  onChange={(e) => onInputChange(itemId, "value", e.target.value, index)}
                  aria-label={`${itemName} value for entry ${index + 1}`}
                  aria-invalid={isInvalidValue(
                    Number(datapoint.value),
                    form.unitOfMeasure || "int"
                  )}
                  aria-describedby={
                    isInvalidValue(Number(datapoint.value), form.unitOfMeasure || "int")
                      ? `value-error-${itemId}-${index}`
                      : undefined
                  }
                  className={cn(
                    "w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:outline-none dark:text-zinc-100",
                    isInvalidValue(Number(datapoint.value), form.unitOfMeasure || "int")
                      ? "border-2 border-red-500"
                      : "border-gray-300"
                  )}
                />
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 whitespace-nowrap">
                  {form.unitOfMeasure || ""}
                </span>
              </div>
              {datapoint.value &&
              isInvalidValue(Number(datapoint.value), form.unitOfMeasure || "int") ? (
                <span
                  id={`value-error-${itemId}-${index}`}
                  role="alert"
                  className="text-xs text-red-500"
                >
                  {form.unitOfMeasure === "int"
                    ? "Please enter an integer number"
                    : "Please enter a valid number"}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-gray-900 dark:text-zinc-100">{datapoint.value || "-"}</span>
          )}
        </div>

        {/* Start Date Column */}
        <div className="px-4 py-2 flex-1 min-w-[150px]">
          {form.isEditing && isAuthorized ? (
            <input
              type="date"
              value={datapoint.startDate?.split("T")[0] || new Date().toISOString().split("T")[0]}
              onChange={(e) => onInputChange(itemId, "startDate", e.target.value, index)}
              aria-label={`Start date for entry ${index + 1}`}
              aria-invalid={hasInvalidDatesSameRow(itemId, datapoint.startDate, datapoint.endDate)}
              className={cn(
                "w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:outline-none dark:text-zinc-100",
                hasInvalidDatesSameRow(itemId, datapoint.startDate, datapoint.endDate) &&
                  "border-2 border-red-500"
              )}
            />
          ) : (
            <span className="text-gray-900 dark:text-zinc-100">
              {datapoint.startDate ? formatDate(new Date(datapoint.startDate), "UTC") : "-"}
            </span>
          )}
        </div>

        {/* End Date Column */}
        <div className="px-4 py-2 flex-1 min-w-[150px]">
          {form.isEditing && isAuthorized ? (
            <input
              type="date"
              value={
                datapoint.endDate?.split("T")[0] ||
                datapoint.outputTimestamp?.split("T")[0] ||
                new Date().toISOString().split("T")[0]
              }
              onChange={(e) => onInputChange(itemId, "endDate", e.target.value, index)}
              aria-label={`End date for entry ${index + 1}`}
              aria-invalid={
                isInvalidTimestamp(itemId, datapoint.endDate || datapoint.outputTimestamp || "") ||
                hasInvalidDatesSameRow(itemId, datapoint.startDate, datapoint.endDate)
              }
              className={cn(
                "w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:outline-none dark:text-zinc-100",
                (isInvalidTimestamp(itemId, datapoint.endDate || datapoint.outputTimestamp || "") ||
                  hasInvalidDatesSameRow(itemId, datapoint.startDate, datapoint.endDate)) &&
                  "border-2 border-red-500"
              )}
            />
          ) : (
            <span className="text-gray-900 dark:text-zinc-100">
              {datapoint.endDate
                ? formatDate(new Date(datapoint.endDate), "UTC")
                : datapoint.outputTimestamp
                  ? formatDate(new Date(datapoint.outputTimestamp), "UTC")
                  : "-"}
            </span>
          )}
        </div>

        {/* Proof Column */}
        <div className="px-4 py-2 flex-1 min-w-[200px]">
          {form.isEditing && isAuthorized ? (
            <input
              type="text"
              value={datapoint.proof || ""}
              onChange={(e) => onInputChange(itemId, "proof", e.target.value, index)}
              aria-label={`Proof URL for entry ${index + 1}`}
              placeholder="Enter proof URL"
              className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:outline-none dark:text-zinc-100"
            />
          ) : datapoint.proof ? (
            <div className="flex flex-col gap-1">
              {parseProofUrls(datapoint.proof).length > 0 ? (
                parseProofUrls(datapoint.proof).map((url, urlIndex) => (
                  <a
                    key={urlIndex}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline dark:text-blue-400 truncate max-w-xs"
                  >
                    {url}
                  </a>
                ))
              ) : (
                <span className="text-gray-900 dark:text-zinc-100">
                  {datapoint.proof || "No proof provided"}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-900 dark:text-zinc-100">No proof provided</span>
          )}
        </div>

        {/* Actions Column */}
        <div className="px-4 py-2 w-[50px] flex-shrink-0">
          {form.isEditing && isAuthorized ? (
            <button
              type="button"
              onClick={() => onDeleteEntry(itemId, index)}
              aria-label={`Delete entry ${index + 1}`}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
            >
              <TrashIcon className="w-4 h-4 text-red-500" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </>
    );
  };

  return (
    <div className="rounded border border-gray-200 dark:border-zinc-700 overflow-hidden">
      {/* Header - Fixed */}
      <div className="bg-gray-50 dark:bg-zinc-800 flex border-b border-gray-200 dark:border-zinc-700">
        <div className="px-3 py-2 flex-1 min-w-[150px] text-left text-xs font-semibold text-gray-600 dark:text-zinc-400">
          {itemName}
        </div>
        <div className="px-3 py-2 flex-1 min-w-[150px] text-left text-xs font-semibold text-gray-600 dark:text-zinc-400">
          Start Date
        </div>
        <div className="px-3 py-2 flex-1 min-w-[150px] text-left text-xs font-semibold text-gray-600 dark:text-zinc-400">
          End Date
        </div>
        <div className="px-3 py-2 flex-1 min-w-[200px] text-left text-xs font-semibold text-gray-600 dark:text-zinc-400">
          Proof
        </div>
        <div className="px-3 py-2 w-[50px] flex-shrink-0 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400">
          <span className="sr-only">Actions</span>
        </div>
      </div>

      {/* Virtualized rows container */}
      <div ref={parentRef} className="overflow-y-auto overflow-x-auto max-h-[280px]">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const index = virtualRow.index;
            const datapoint = datapoints[index];
            return (
              <div
                key={virtualRow.key}
                data-index={index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={cn(
                  "flex border-b border-gray-100 dark:border-zinc-800",
                  "bg-white dark:bg-zinc-800/50"
                )}
              >
                {renderRowContent(index, datapoint)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add new entry button - rendered outside virtualized area */}
      {form.isEditing && isAuthorized && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-800/50">
          <Button onClick={() => onAddEntry(itemId)}>Add new entry</Button>
        </div>
      )}
    </div>
  );
};
