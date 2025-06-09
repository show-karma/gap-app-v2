"use client";
import { useState, useEffect, useRef } from "react";
import {
  XMarkIcon,
  ChevronDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import { cn } from "@/utilities/tailwind";

export interface DropdownItem {
  id: string;
  label: string;
  value?: any;
}

interface MultiSelectDropdownProps {
  items: DropdownItem[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export const MultiSelectDropdown = ({
  items,
  selectedIds,
  onChange,
  placeholder = "Select items",
  searchPlaceholder = "Search...",
  className = "",
  label,
  disabled = false,
  required = false,
  error,
}: MultiSelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter items based on search term
  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle clicking outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toggle an item selection
  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  // Remove a selected item
  const removeItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  // Clear all selected items
  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Get selected item labels for display
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-bold text-black dark:text-zinc-100 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        className={cn(
          "relative flex min-h-[40px] w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm outline-none transition-all dark:border-zinc-700 dark:bg-zinc-800",
          isOpen && "border-brand-blue dark:border-brand-blue",
          error && "border-red-500 dark:border-red-500",
          disabled && "cursor-not-allowed opacity-50"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1">
          {selectedItems.length > 0 ? (
            selectedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs dark:bg-zinc-700"
              >
                <span>{item.label}</span>
                <XMarkIcon
                  className="h-3 w-3 cursor-pointer text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  onClick={(e) => removeItem(item.id, e)}
                />
              </div>
            ))
          ) : (
            <span className="text-gray-500 dark:text-zinc-400">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {selectedItems.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Clear
            </button>
          )}
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <div className="p-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-gray-200 bg-white py-1 pl-8 pr-2 text-sm focus:border-brand-blue focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-brand-blue"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-2">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700",
                    selectedIds.includes(item.id) &&
                      "bg-gray-100 dark:bg-zinc-700"
                  )}
                  onClick={() => toggleItem(item.id)}
                >
                  <span>{item.label}</span>
                  {selectedIds.includes(item.id) && (
                    <CheckIcon className="h-4 w-4 text-brand-blue" />
                  )}
                </div>
              ))
            ) : (
              <div className="px-2 py-1 text-sm text-gray-500 dark:text-zinc-400">
                No items found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
