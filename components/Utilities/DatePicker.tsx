"use client"

import { CalendarIcon } from "@heroicons/react/24/solid"
import * as Popover from "@radix-ui/react-popover"
import { DayPicker } from "react-day-picker"
import { formatDate } from "@/utilities/formatDate"
import { cn } from "@/utilities/tailwind"

interface DatePickerProps {
  selected?: Date
  onSelect: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  placeholder?: string
  className?: string
  buttonClassName?: string
  clearButtonClassName?: string
  clearButtonFn?: () => void
}

export const DatePicker = ({
  selected,
  onSelect,
  minDate = new Date("2000-01-01"),
  maxDate,
  placeholder = "Pick a date",
  className,
  buttonClassName,
  clearButtonClassName,
  clearButtonFn,
}: DatePickerProps) => {
  return (
    <div className={className}>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            className={cn(
              "w-max text-sm flex-row flex gap-2 items-center bg-white dark:bg-zinc-800 px-4 py-2 rounded-md border border-gray-200 dark:border-zinc-700",
              buttonClassName
            )}
          >
            {selected ? formatDate(selected) : <span>{placeholder}</span>}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="z-[100] bg-white dark:bg-zinc-800 mt-4 rounded-md shadow-lg">
            <DayPicker
              mode="single"
              selected={selected}
              onDayClick={onSelect}
              disabled={(date) => {
                if (minDate === date) return false
                if (minDate && date < minDate) return true
                if (maxDate && date > maxDate) return true
                return false
              }}
              initialFocus
            />
            {clearButtonFn && (
              <div className="flex flex-row gap-2 items-center justify-end px-6 pb-2">
                <button
                  className={cn(
                    "w-max bg-transparent border px-4 py-2 rounded-md",
                    clearButtonClassName
                  )}
                  onClick={clearButtonFn}
                >
                  Clear
                </button>
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
