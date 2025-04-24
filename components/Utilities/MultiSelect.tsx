"use client";
import { useState, useEffect, useRef } from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { cn } from "@/utilities/tailwind";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const MultiSelect = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
}: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter options based on search
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  // Handle selecting/deselecting an option
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  // Get labels of selected options
  const selectedLabels = options
    .filter((option) => value.includes(option.value))
    .map((option) => option.label);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* Selected items display */}
      <div
        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 cursor-pointer min-h-[42px] flex flex-wrap gap-2 items-center"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && inputRef.current) {
            setTimeout(() => {
              inputRef.current?.focus();
            }, 0);
          }
        }}
      >
        {value.length === 0 ? (
          <span className="text-gray-400 dark:text-gray-500">
            {placeholder}
          </span>
        ) : (
          <>
            {selectedLabels.map((label) => (
              <span
                key={label}
                className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-sm flex items-center"
              >
                {label}
                <XMarkIcon
                  className="h-3.5 w-3.5 ml-1 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const optionToRemove = options.find(
                      (o) => o.label === label
                    );
                    if (optionToRemove) {
                      onChange(value.filter((v) => v !== optionToRemove.value));
                    }
                  }}
                />
              </span>
            ))}
          </>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute mt-1 w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-60 overflow-auto">
          {/* Search input */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-zinc-800">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options list */}
          {filteredOptions.length > 0 ? (
            <ul className="py-1">
              {filteredOptions.map((option) => (
                <li
                  key={option.value}
                  className={cn(
                    "px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer flex items-center justify-between",
                    value.includes(option.value)
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : ""
                  )}
                  onClick={() => toggleOption(option.value)}
                >
                  <span>{option.label}</span>
                  {value.includes(option.value) && (
                    <CheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
