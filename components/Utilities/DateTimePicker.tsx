"use client";

import { CalendarIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/utilities/tailwind";

interface DateTimePickerProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  clearButtonFn?: () => void;
  /**
   * Determines the automatic time setting:
   * - "start": Sets time to 00:00 UTC (beginning of day)
   * - "end": Sets time to 23:59 UTC (end of day)
   */
  timeMode: "start" | "end";
}

/**
 * Formats a date for display in UTC timezone
 * Shows: "MMM D, YYYY at HH:MM UTC"
 */
const formatDateTimeUTC = (date: Date): string => {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const month = monthNames[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");

  return `${month} ${day}, ${year} at ${hours}:${minutes} UTC`;
};

/**
 * Creates a Date object from a selected day in UTC with automatic time based on mode
 */
const createUTCDateWithTime = (day: Date, mode: "start" | "end"): Date => {
  const hours = mode === "start" ? 0 : 23;
  const minutes = mode === "start" ? 0 : 59;

  return new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0));
};

export const DateTimePicker = ({
  selected,
  onSelect,
  minDate = new Date("2000-01-01"),
  maxDate,
  placeholder = "Pick a date",
  className,
  buttonClassName,
  clearButtonFn,
  timeMode,
}: DateTimePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) {
      onSelect(undefined);
      setIsOpen(false);
      return;
    }

    const newDate = createUTCDateWithTime(day, timeMode);
    onSelect(newDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    clearButtonFn?.();
    setIsOpen(false);
  };

  return (
    <div className={className}>
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              "w-max text-sm flex-row flex gap-2 items-center bg-white dark:bg-zinc-800 px-4 py-2 rounded-md border border-gray-200 dark:border-zinc-700 text-left",
              buttonClassName
            )}
          >
            <span className={cn(!selected && "text-gray-400 dark:text-gray-500")}>
              {selected ? formatDateTimeUTC(selected) : placeholder}
            </span>
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="z-[100] bg-white dark:bg-zinc-800 mt-4 rounded-md shadow-lg p-4"
            sideOffset={4}
          >
            <DayPicker
              mode="single"
              selected={selected}
              onDayClick={handleDaySelect}
              disabled={(date) => {
                if (minDate === date) return false;
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              initialFocus
            />

            {/* Time info display */}
            <div className="border-t border-gray-200 dark:border-zinc-700 pt-3 mt-2">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>
                  Time will be set to{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {timeMode === "start" ? "00:00" : "23:59"} UTC
                  </span>
                </span>
              </div>
            </div>

            {/* Clear button */}
            {clearButtonFn && selected && (
              <div className="flex flex-row gap-2 items-center justify-end mt-3">
                <button
                  type="button"
                  className="w-max bg-transparent border border-gray-300 dark:border-zinc-600 px-4 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                  onClick={handleClear}
                >
                  Clear
                </button>
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};
