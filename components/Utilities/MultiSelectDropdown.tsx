"use client";
import {
  CheckIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { memo, useEffect, useRef, useState } from "react";
import { cn } from "@/utilities/tailwind";

export interface DropdownItem {
  id: string;
  label: string;
  value?: unknown;
  color?: string;
}

interface SelectedChipProps {
  id: string;
  label: string;
  color?: string;
  isUnknown?: boolean;
  unknownHint?: string;
  disabled: boolean;
  onRemove: (id: string) => void;
}

/**
 * A single selected-value chip. Rendered for every selected id — including
 * "unknown" ids that have no matching item in the available list (see
 * `showUnknownSelections`). Unknown chips get a distinct warning treatment and
 * remain removable so stale/orphaned selections can always be cleared.
 */
const SelectedChip = memo(function SelectedChip({
  id,
  label,
  color,
  isUnknown = false,
  unknownHint,
  disabled,
  onRemove,
}: SelectedChipProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) onRemove(id);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md px-2 py-1 text-xs",
        isUnknown
          ? "border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-300"
          : "bg-gray-100 dark:bg-zinc-700"
      )}
      title={isUnknown ? `${unknownHint ?? "Not in the available list"}: ${id}` : undefined}
    >
      {isUnknown && (
        <ExclamationTriangleIcon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
      )}
      {color && (
        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      )}
      <span className="truncate max-w-[200px]">{label}</span>
      <button
        type="button"
        aria-label={`Remove ${label}`}
        disabled={disabled}
        onClick={handleRemove}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(
          "flex flex-shrink-0 items-center rounded",
          isUnknown ? "text-amber-600 dark:text-amber-300" : "text-gray-500 dark:text-zinc-400",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:text-gray-700 dark:hover:text-zinc-200"
        )}
      >
        <XMarkIcon className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
});

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
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  /** When true, a selected id with no matching item is still rendered as a
   *  (removable) "unknown" chip instead of being silently hidden. Defaults to
   *  false to preserve behaviour for existing consumers. */
  showUnknownSelections?: boolean;
  /** Formats the label of an unknown selection chip (e.g. shorten a wallet
   *  address). Defaults to showing the raw id. */
  formatUnknownLabel?: (id: string) => string;
  /** Hint shown on hover for unknown selection chips. */
  unknownSelectionHint?: string;
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
  emptyActionLabel,
  onEmptyAction,
  showUnknownSelections = false,
  formatUnknownLabel,
  unknownSelectionHint,
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
    if (isLoading) {
      setIsOpen(false);
    }
  }, [isLoading]);

  // Reset the search term whenever the dropdown closes so it doesn't carry
  // over to the next time the user opens it.
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

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

  // Remove a selected item (works for known items and unknown/orphan ids alike)
  const handleRemoveSelection = (id: string) => {
    if (isDisabled) return;
    const newSelectedIds = localSelectedIds.filter((selectedId) => selectedId !== id);
    setLocalSelectedIds(newSelectedIds);
    onChange(newSelectedIds);
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

  // Selected ids that have no matching item — these are "orphan"/unknown
  // selections. They are only surfaced when the consumer opts in, so they're
  // never silently dropped (which would leave them invisible and unremovable).
  const unknownSelectedIds = showUnknownSelections
    ? localSelectedIds.filter((id) => !items.some((item) => item.id === id))
    : [];

  const hasSelections = selectedItems.length > 0 || unknownSelectedIds.length > 0;

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

      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : 0}
        className={cn(
          "relative flex min-h-[40px] w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm outline-none transition-all dark:border-zinc-700 dark:bg-zinc-800",
          isOpen && !isDisabled && "border-brand-blue dark:border-brand-blue",
          error && "border-red-500 dark:border-red-500",
          isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        )}
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (isDisabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          } else if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
      >
        <div className="flex flex-1 min-w-0 flex-wrap gap-1">
          {hasSelections ? (
            <>
              {selectedItems.map((item) => (
                <SelectedChip
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  color={item.color}
                  disabled={isDisabled}
                  onRemove={handleRemoveSelection}
                />
              ))}
              {unknownSelectedIds.map((id) => (
                <SelectedChip
                  key={id}
                  id={id}
                  label={formatUnknownLabel ? formatUnknownLabel(id) : id}
                  isUnknown
                  unknownHint={unknownSelectionHint}
                  disabled={isDisabled}
                  onRemove={handleRemoveSelection}
                />
              ))}
            </>
          ) : (
            <span className="text-gray-500 dark:text-zinc-400">{placeholder}</span>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {hasSelections && (
            <button
              type="button"
              onClick={clearAll}
              onMouseDown={(e) => e.stopPropagation()}
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
      </div>

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
              <>
                {filteredItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={cn(
                      "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm bg-transparent border-none text-left mb-1 last:mb-0",
                      "cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700",
                      localSelectedIds.includes(item.id) && "bg-gray-100 dark:bg-zinc-700"
                    )}
                    onClick={() => toggleItem(item.id)}
                  >
                    <span className="flex items-center gap-2">
                      {item.color && (
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      {item.label}
                    </span>
                    {localSelectedIds.includes(item.id) && (
                      <CheckIcon className="h-4 w-4 text-brand-blue" />
                    )}
                  </button>
                ))}
                {onEmptyAction && emptyActionLabel && (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-transparent text-left mt-1 cursor-pointer text-brand-blue font-medium border-0 border-t border-solid border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700"
                    onClick={() => {
                      setIsOpen(false);
                      onEmptyAction();
                    }}
                  >
                    <PlusIcon className="h-4 w-4 flex-shrink-0" />
                    {emptyActionLabel}
                  </button>
                )}
              </>
            ) : (
              <div className="px-2 py-1">
                <div className="text-sm text-gray-500 dark:text-zinc-400">No items found</div>
                {onEmptyAction && emptyActionLabel && (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline bg-transparent border-none p-0 cursor-pointer"
                    onClick={() => {
                      setIsOpen(false);
                      onEmptyAction();
                    }}
                  >
                    <PlusIcon className="h-4 w-4 flex-shrink-0" />
                    {emptyActionLabel}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
