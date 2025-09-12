"use client";

import { Button } from "@/components/Utilities/Button";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useState, useRef, useEffect } from "react";

export type TimeframeOption = "1_month" | "3_months" | "6_months" | "1_year";

export interface TimeframeConfig {
  label: string;
  value: TimeframeOption;
  months: number;
}

export const timeframeOptions: TimeframeConfig[] = [
  { label: "1 Month", value: "1_month", months: 1 },
  { label: "3 Months", value: "3_months", months: 3 },
  { label: "6 Months", value: "6_months", months: 6 },
  { label: "1 Year", value: "1_year", months: 12 },
];

interface TimeframeSelectorProps {
  selectedTimeframe: TimeframeOption;
  onTimeframeChange: (timeframe: TimeframeOption) => void;
  className?: string;
}

export function TimeframeSelector({
  selectedTimeframe,
  onTimeframeChange,
  className = "",
}: TimeframeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = timeframeOptions.find(option => option.value === selectedTimeframe);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {selectedOption?.label}
        <ChevronDownIcon 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 min-w-[120px] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg">
          <div className="py-1">
            {timeframeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onTimeframeChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${
                  option.value === selectedTimeframe
                    ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
