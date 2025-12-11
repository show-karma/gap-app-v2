"use client";
import {
  CheckIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/utilities/tailwind";

export interface DropdownItem {
  id: string;
  label: string;
  value?: unknown;
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
  isLoading?: boolean; // Optional loading state prop
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
  isLoading = false,
}: MultiSelectDropdownProps) => {
  const isDisabled = disabled || isLoading;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Maintain local state for selected IDs to handle rapid clicks
  // Sync with prop when it changes
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

  useEffect(() => {
    setLocalSelectedIds(selectedIds);
  }, [selectedIds]);

  // Filter items based on search term
  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle clicking outside the dropdown to close it
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

  // Close dropdown when loading starts
  useEffect(() => {
    if (isLoading && isOpen) {
      setIsOpen(false);
    }
  }, [isLoading, isOpen]);

  // Toggle an item selection
  const toggleItem = (id: string) => {
    if (isDisabled) return;
    const newSelectedIds = localSelectedIds.includes(id)
      ? localSelectedIds.filter((selectedId) => selectedId !== id)
      : [...localSelectedIds, id];

    // Update local state immediately for responsive UI
    setLocalSelectedIds(newSelectedIds);
    // Notify parent
    onChange(newSelectedIds);
  };

  // Remove a selected item
  const removeItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDisabled) {
      const newSelectedIds = localSelectedIds.filter((selectedId) => selectedId !== id);
      setLocalSelectedIds(newSelectedIds);
      onChange(newSelectedIds);
    }
  };

  // Clear all selected items
  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDisabled) {
      setLocalSelectedIds([]);
      onChange([]);
    }
  };

  // Get selected item labels for display
  const selectedItems = items.filter((item) => localSelectedIds.includes(item.id));

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: This div only stops event propagation, it's not interactive
    <div
      className={`relative w-full ${className}`}
      ref={dropdownRef}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {label && (
        <div className="block text-sm font-bold text-black dark:text-zinc-100 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </div>
      )}

      <button
        type="button"
        className={cn(
          "relative flex min-h-[40px] w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm outline-none transition-all dark:border-zinc-700 dark:bg-zinc-800",
          isOpen && !isDisabled && "border-brand-blue dark:border-brand-blue",
          error && "border-red-500 dark:border-red-500",
          isDisabled && "cursor-not-allowed opacity-50"
        )}
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled}
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
                  className={cn(
                    "h-3 w-3 text-gray-500 dark:text-zinc-400",
                    isDisabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer hover:text-gray-700 dark:hover:text-zinc-200"
                  )}
                  onClick={(e) => removeItem(item.id, e)}
                />
              </div>
            ))
          ) : (
            <span className="text-gray-500 dark:text-zinc-400">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              onMouseDown={(e) => e.stopPropagation()} // Prevent dropdown from opening when clicking Clear
              disabled={isDisabled}
              className={cn(
                "text-xs px-2 py-1 rounded-md font-medium transition-all",
                isDisabled
                  ? "text-gray-400 dark:text-zinc-600 cursor-not-allowed bg-gray-100 dark:bg-zinc-800"
                  : "text-gray-700 dark:text-zinc-300 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 border border-gray-200 dark:border-zinc-600"
              )}
              title="Clear all selections"
            >
              Clear
            </button>
          )}
          {isLoading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-zinc-600 dark:border-t-zinc-300 flex-shrink-0" />
          )}
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 transition-transform flex-shrink-0",
              isOpen && "rotate-180",
              isDisabled && "opacity-50"
            )}
          />
        </div>
      </button>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {isOpen && !isDisabled && (
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
                <button
                  type="button"
                  key={item.id}
                  className={cn(
                    "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm bg-transparent border-none text-left mb-1 last:mb-0",
                    isDisabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700",
                    localSelectedIds.includes(item.id) && "bg-gray-100 dark:bg-zinc-700"
                  )}
                  onClick={() => toggleItem(item.id)}
                  disabled={isDisabled}
                >
                  <span>{item.label}</span>
                  {localSelectedIds.includes(item.id) && (
                    <CheckIcon className="h-4 w-4 text-brand-blue" />
                  )}
                </button>
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
