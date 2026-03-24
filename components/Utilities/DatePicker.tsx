"use client";

// CSS co-located with component — bundled in the same chunk since DatePicker
// is always dynamically imported. Avoids loading this CSS on pages that don't
// use the date picker.
import "react-day-picker/dist/style.css";
import { CalendarIcon } from "@heroicons/react/24/solid";
import * as Popover from "@radix-ui/react-popover";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/utilities/tailwind";

interface DatePickerProps {
  selected?: Date;
  onSelect: (date: Date) => void;
  onInvalidInput?: () => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  clearButtonClassName?: string;
  clearButtonFn?: () => void;
  ariaLabel?: string;
  disabled?: boolean;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDisplayDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

interface ParseResult {
  date: Date | null;
  error: string | null;
}

function parseInputDate(text: string): ParseResult {
  const trimmed = text.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return { date: null, error: "Invalid date. Use MM/DD/YYYY format." };

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12) return { date: null, error: "Month must be between 01 and 12" };
  if (day < 1 || day > 31) return { date: null, error: "Day must be between 01 and 31" };

  const maxYear = new Date().getFullYear() + 10;
  if (year > maxYear) return { date: null, error: `Year cannot be later than ${maxYear}` };

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { date: null, error: `Invalid day for ${match[1]}/${match[3]}` };
  }

  return { date, error: null };
}

export const DatePicker = ({
  selected,
  onSelect,
  onInvalidInput,
  minDate = new Date("2000-01-01"),
  maxDate,
  placeholder = "MM/DD/YYYY",
  className,
  buttonClassName,
  clearButtonClassName,
  clearButtonFn,
  ariaLabel,
  disabled = false,
}: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(selected ? toDisplayDate(selected) : "");
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected) {
      setInputValue(toDisplayDate(selected));
      setLocalError(null);
    } else {
      setInputValue("");
    }
  }, [selected]);

  const validateAndSelect = (value: string): boolean => {
    if (!value.trim()) {
      setLocalError(null);
      onInvalidInput?.();
      return false;
    }

    const { date: parsed, error: parseError } = parseInputDate(value);
    if (!parsed) {
      setLocalError(parseError);
      onInvalidInput?.();
      return false;
    }

    const normalizedParsed = startOfDay(parsed);
    if (minDate && normalizedParsed < startOfDay(minDate)) {
      setLocalError(`Date must be on or after ${toDisplayDate(minDate)}`);
      onInvalidInput?.();
      return false;
    }

    if (maxDate && normalizedParsed > startOfDay(maxDate)) {
      setLocalError(`Date must be on or before ${toDisplayDate(maxDate)}`);
      onInvalidInput?.();
      return false;
    }

    setLocalError(null);
    setInputValue(toDisplayDate(parsed));
    onSelect(parsed);
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 8);
    let formatted = "";
    for (let i = 0; i < digitsOnly.length; i++) {
      if (i === 2 || i === 4) formatted += "/";
      formatted += digitsOnly[i];
    }
    setInputValue(formatted);
    if (localError) setLocalError(null);
  };

  const handleBlur = () => {
    validateAndSelect(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      validateAndSelect(inputValue);
    }
  };

  const handleDayClick = (date: Date) => {
    onSelect(date);
    setInputValue(toDisplayDate(date));
    setLocalError(null);
    setOpen(false);
  };

  const handleClear = () => {
    clearButtonFn?.();
    setInputValue("");
    setLocalError(null);
    setOpen(false);
  };

  return (
    <div className={className}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              "w-full text-sm bg-white dark:bg-zinc-800 px-4 py-2 pr-10 rounded-md border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
              localError && "border-red-500 dark:border-red-500 focus:ring-red-500",
              disabled && "opacity-50 cursor-not-allowed",
              buttonClassName
            )}
          />
          <Popover.Trigger asChild>
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
              aria-label="Open calendar"
              disabled={disabled}
              tabIndex={-1}
            >
              <CalendarIcon className="h-4 w-4 opacity-50" />
            </button>
          </Popover.Trigger>
        </div>
        <Popover.Portal>
          <Popover.Content
            className="z-[100] bg-white dark:bg-zinc-800 mt-4 rounded-md shadow-lg"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <DayPicker
              mode="single"
              selected={selected}
              onDayClick={handleDayClick}
              defaultMonth={selected || undefined}
              disabled={(date) => {
                if (minDate && startOfDay(date) < startOfDay(minDate)) return true;
                if (maxDate && startOfDay(date) > startOfDay(maxDate)) return true;
                return false;
              }}
            />
            {clearButtonFn && (
              <div className="flex flex-row gap-2 items-center justify-end px-6 pb-2">
                <button
                  type="button"
                  className={cn(
                    "w-max bg-transparent border px-4 py-2 rounded-md",
                    clearButtonClassName
                  )}
                  onClick={handleClear}
                >
                  Clear
                </button>
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {localError && <p className="text-sm text-red-500 mt-1">{localError}</p>}
    </div>
  );
};
