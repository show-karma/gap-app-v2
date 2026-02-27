"use client";

import type { LucideIcon } from "lucide-react";
import { BadgeCheck, CircleDollarSign, Goal, Rss } from "lucide-react";
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
  counts?: Partial<Record<ActivityFilterType, number>>;
  milestonesCount?: number;
  completedCount?: number;
  className?: string;
}

// Visible filter types
const VISIBLE_FILTERS: ActivityFilterType[] = ["funding", "milestones", "endorsements", "updates"];

// Icon and color config per filter category (matches Figma designs)
const FILTER_CONFIG: Partial<Record<ActivityFilterType, { icon: LucideIcon; iconClass: string }>> =
  {
    funding: { icon: CircleDollarSign, iconClass: "text-emerald-600 dark:text-emerald-400" },
    milestones: { icon: Goal, iconClass: "text-indigo-600 dark:text-indigo-400" },
    updates: { icon: Rss, iconClass: "text-violet-600 dark:text-violet-400" },
    endorsements: { icon: BadgeCheck, iconClass: "text-pink-500 dark:text-pink-400" },
  };

/**
 * ActivityFilters provides sorting and filtering controls for the activity feed.
 * Includes:
 * - Sort dropdown (Newest/Oldest)
 * - Filter pills with icon + label + count chip (Figma design)
 */
export function ActivityFilters({
  sortBy,
  onSortChange,
  activeFilters,
  onFilterToggle,
  counts = {},
  milestonesCount = 0,
  completedCount = 0,
  className,
}: ActivityFiltersProps) {
  const filterOptions = ACTIVITY_FILTER_OPTIONS.filter((option) =>
    VISIBLE_FILTERS.includes(option.value)
  ).sort((a, b) => {
    const aEmpty = !counts[a.value];
    const bEmpty = !counts[b.value];
    if (aEmpty === bEmpty) return 0;
    return aEmpty ? 1 : -1;
  });

  const totalCount = Object.values(counts).reduce((sum, c) => sum + (c || 0), 0);

  return (
    <div className={cn("flex flex-col gap-4", className)} data-testid="activity-filters">
      {/* Single row: Filter pills on left, Sort on right */}
      <div className="flex flex-row items-center justify-between flex-wrap gap-4">
        {/* Filter pills */}
        <div className="flex flex-row flex-wrap gap-2" data-testid="filter-badges">
          {/* All button */}
          <button
            type="button"
            onClick={() => {
              if (activeFilters.length > 0) {
                for (const filter of activeFilters) onFilterToggle(filter);
              }
            }}
            data-testid="filter-everything"
            aria-pressed={activeFilters.length === 0}
            aria-label="Show everything"
            className={cn(
              "flex items-center gap-1.5 px-2 py-[5px] rounded-full transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400",
              activeFilters.length === 0 ? "bg-foreground" : "bg-secondary"
            )}
          >
            <span
              className={cn(
                "text-[12px] font-medium tracking-[0.18px] leading-[1.5]",
                activeFilters.length === 0 ? "text-background" : "text-foreground"
              )}
            >
              All
            </span>
            {totalCount > 0 && (
              <span
                className={cn(
                  "flex items-center justify-center border rounded-full w-[18px] h-[18px] text-[11px] font-medium tabular-nums leading-none",
                  activeFilters.length === 0
                    ? "border-background/20 text-background/70"
                    : "border-border text-muted-foreground"
                )}
              >
                {totalCount}
              </span>
            )}
          </button>

          {/* Category filter pills */}
          {filterOptions.map((filter) => {
            const isActive = activeFilters.includes(filter.value);
            const count = counts[filter.value];
            const isEmpty = !count;
            const config = FILTER_CONFIG[filter.value];
            const Icon = config?.icon;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => onFilterToggle(filter.value)}
                disabled={isEmpty}
                data-testid={`filter-${filter.value}`}
                aria-pressed={isActive}
                aria-label={`Filter by ${filter.label}`}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-[5px] rounded-full transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  isEmpty && "max-lg:hidden",
                  isActive ? "bg-foreground" : "bg-secondary"
                )}
              >
                {Icon && <Icon className={cn("w-[13px] h-[13px] shrink-0", config?.iconClass)} />}
                <span
                  className={cn(
                    "text-[12px] font-medium tracking-[0.18px] leading-[1.5] whitespace-nowrap",
                    isActive ? "text-background" : "text-foreground"
                  )}
                >
                  {filter.label}
                </span>
                {count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      "flex items-center justify-center border rounded-full w-[18px] h-[18px] text-[11px] font-medium tabular-nums leading-none",
                      isActive
                        ? "border-background/20 text-background/70"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

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
      </div>
    </div>
  );
}
