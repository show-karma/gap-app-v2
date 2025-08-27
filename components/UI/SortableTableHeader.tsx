"use client";

import { FC } from "react";
import { cn } from "@/utilities/tailwind";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export type SortDirection = 'asc' | 'desc' | null;

interface ISortableTableHeaderProps {
  label: string;
  sortKey?: string;
  currentSortKey?: string | null;
  currentSortDirection?: SortDirection;
  onSort?: (key: string) => void;
  className?: string;
  sortable?: boolean;
}

const SortableTableHeader: FC<ISortableTableHeaderProps> = ({
  label,
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
  className,
  sortable = true,
}) => {
  const isActive = sortKey === currentSortKey;
  
  const handleClick = () => {
    if (sortable && sortKey && onSort) {
      onSort(sortKey);
    }
  };

  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
        "text-gray-600 dark:text-gray-400",
        sortable && sortKey && "cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors",
        isActive && "text-gray-900 dark:text-white",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {sortable && sortKey && (
          <div className="flex flex-col">
            <ChevronUpIcon
              className={cn(
                "h-3 w-3 transition-colors",
                isActive && currentSortDirection === 'asc'
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-600"
              )}
            />
            <ChevronDownIcon
              className={cn(
                "h-3 w-3 -mt-1 transition-colors",
                isActive && currentSortDirection === 'desc'
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-600"
              )}
            />
          </div>
        )}
      </div>
    </th>
  );
};

export default SortableTableHeader;