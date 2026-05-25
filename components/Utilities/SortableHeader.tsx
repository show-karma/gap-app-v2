import { ChevronDownIcon, ChevronUpDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { cn } from "@/utilities/tailwind";

interface SortableHeaderProps<F extends string> {
  label: string;
  field: F;
  sortBy: F | null;
  sortOrder: string;
  onSort: (field: F) => void;
}

/**
 * Clickable table header that toggles a server-side sort for `field`.
 * Shows an up/down chevron for the active column and a neutral chevron
 * otherwise. Generic over the sort-field union so callers stay type-safe.
 */
export function SortableHeader<F extends string>({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
}: SortableHeaderProps<F>) {
  const isActive = sortBy === field;
  return (
    <th scope="col" className="h-11 px-4 text-left align-middle font-medium">
      <button
        type="button"
        aria-label={`Sort by ${label}`}
        className={cn(
          "flex items-center gap-1.5 text-xs uppercase tracking-wider transition-colors",
          isActive
            ? "text-gray-900 dark:text-white"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        )}
        onClick={() => onSort(field)}
      >
        {label}
        {isActive ? (
          sortOrder === "asc" ? (
            <ChevronUpIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronUpDownIcon className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  );
}
