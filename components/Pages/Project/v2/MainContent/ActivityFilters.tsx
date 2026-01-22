"use client";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActivityFilterType, SortOption } from "@/types/v2/project-profile.types";
import { ACTIVITY_FILTER_OPTIONS } from "@/types/v2/project-profile.types";
import { cn } from "@/utilities/tailwind";

// Re-export types for backward compatibility
export type { ActivityFilterType, SortOption } from "@/types/v2/project-profile.types";

interface ActivityFiltersProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  activeFilters: ActivityFilterType[];
  onFilterToggle: (filter: ActivityFilterType) => void;
  milestonesCount?: number;
  completedCount?: number;
  className?: string;
}

// Use shared filter options from types, but hide blog, socials, and other
const filterOptions = ACTIVITY_FILTER_OPTIONS.filter(
  (option) => !["blog", "socials", "other"].includes(option.value)
);

/**
 * ActivityFilters provides sorting and filtering controls for the activity feed.
 * Includes:
 * - Sort dropdown (Newest/Oldest)
 * - Milestone count display
 * - Filter badges (toggleable)
 */
export function ActivityFilters({
  sortBy,
  onSortChange,
  activeFilters,
  onFilterToggle,
  milestonesCount = 0,
  completedCount = 0,
  className,
}: ActivityFiltersProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)} data-testid="activity-filters">
      {/* Top row: Sort and milestone count */}
      <div className="flex flex-row items-center justify-between flex-wrap gap-4">
        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
          <SelectTrigger className="w-[140px]" data-testid="sort-select">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest" data-testid="sort-newest">
              Newest first
            </SelectItem>
            <SelectItem value="oldest" data-testid="sort-oldest">
              Oldest first
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Milestone Count */}
        {milestonesCount > 0 && (
          <span
            className="text-xl font-semibold leading-tight tracking-tight text-foreground"
            data-testid="milestones-count"
          >
            {milestonesCount} {milestonesCount === 1 ? "Milestone" : "Milestones"}, {completedCount}{" "}
            Completed
          </span>
        )}
      </div>

      {/* Filter Badges */}
      <div className="flex flex-row flex-wrap gap-2" data-testid="filter-badges">
        {/* Everything button - shows all items */}
        <button
          type="button"
          onClick={() => {
            if (activeFilters.length > 0) {
              activeFilters.forEach((filter) => {
                onFilterToggle(filter);
              });
            }
          }}
          data-testid="filter-everything"
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400 rounded-md"
        >
          <Badge
            variant={activeFilters.length === 0 ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-colors rounded-md",
              activeFilters.length === 0
                ? "bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white"
                : "text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-zinc-600 hover:bg-neutral-100 dark:hover:bg-zinc-700"
            )}
          >
            Everything
          </Badge>
        </button>

        {/* Category filter buttons */}
        {filterOptions.map((filter) => {
          const isActive = activeFilters.includes(filter.value);
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onFilterToggle(filter.value)}
              data-testid={`filter-${filter.value}`}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400 rounded-md"
            >
              <Badge
                variant={isActive ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors rounded-md",
                  isActive
                    ? "bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white"
                    : "text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-zinc-600 hover:bg-neutral-100 dark:hover:bg-zinc-700"
                )}
              >
                {filter.label}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
