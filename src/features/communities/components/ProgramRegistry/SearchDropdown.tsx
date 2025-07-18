"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface SearchDropdownProps {
  onSelectFunction: (value: string) => void;
  selected: string[];
  list: string[];
  type: string;
  prefixUnselected?: string;
  buttonClassname?: string;
  canSearch?: boolean;
  shouldSort?: boolean;
  placeholderText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  paragraphClassname?: string;
}

export const SearchDropdown: React.FC<SearchDropdownProps> = ({
  onSelectFunction,
  selected,
  list,
  type,
  prefixUnselected = "Select a",
  buttonClassname = "",
  canSearch = false,
  shouldSort = false,
  placeholderText = "Search...",
  leftIcon,
  rightIcon,
  paragraphClassname = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter and sort the list
  const filteredList = list.filter((item) =>
    item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const processedList = shouldSort 
    ? filteredList.sort((a, b) => a.localeCompare(b))
    : filteredList;

  const handleSelect = (value: string) => {
    onSelectFunction(value);
    setIsOpen(false);
    setSearchTerm("");
  };

  const displayText = selected.length > 0 
    ? selected[0] 
    : `${prefixUnselected} ${type}`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative w-full cursor-pointer rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 py-3 px-4 text-left shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500",
          "flex items-center justify-between gap-3",
          buttonClassname
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {leftIcon && <div className="flex-shrink-0">{leftIcon}</div>}
          <span 
            className={cn(
              "block truncate text-left",
              selected.length === 0 
                ? "text-gray-500 dark:text-zinc-400" 
                : "text-gray-900 dark:text-white",
              paragraphClassname
            )}
          >
            {displayText}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {rightIcon && <div className="flex-shrink-0">{rightIcon}</div>}
          <ChevronDownIcon
            className={cn(
              "h-5 w-5 text-gray-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 shadow-lg">
          {canSearch && (
            <div className="p-3 border-b border-gray-200 dark:border-zinc-600">
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm placeholder-gray-500 dark:placeholder-zinc-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder={placeholderText}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          )}
          
          <div className="max-h-60 overflow-auto py-1">
            {processedList.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-zinc-400">
                {searchTerm ? "No results found" : `No ${type}s available`}
              </div>
            ) : (
              processedList.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 focus:outline-none",
                    selected.includes(item)
                      ? "bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300"
                      : "text-gray-900 dark:text-white"
                  )}
                >
                  {item}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchDropdown;