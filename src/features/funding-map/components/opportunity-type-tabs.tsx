"use client";

import { useCallback, useMemo, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utilities/tailwind";
import { OPPORTUNITY_TYPES } from "../constants/filter-options";
import { useFundingFilters } from "../hooks/use-funding-filters";
import { useTypeCounts } from "../hooks/use-funding-programs";
import type { OpportunityType } from "../types/funding-program";
import { getOpportunityTypeConfig } from "../utils/opportunity-type-config";

function getStatusCount(tc: { count: number; activeCount: number }, status: string): number {
  return status === "Inactive" ? tc.count - tc.activeCount : tc.activeCount;
}

export function OpportunityTypeTabs() {
  const { filters, setSelectedTypes } = useFundingFilters();
  const {
    data: typeCounts,
    isLoading,
    isError,
    refetch,
  } = useTypeCounts({
    onlyOnKarma: filters.onlyOnKarma || undefined,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const isAllSelected = filters.selectedTypes.length === 0;

  const { countsByType, totalCount } = useMemo(() => {
    if (!typeCounts) return { countsByType: null, totalCount: undefined };
    const map = new Map<string, number>();
    let total = 0;
    for (const tc of typeCounts) {
      const c = getStatusCount(tc, filters.status);
      map.set(tc.type, c);
      total += c;
    }
    return { countsByType: map, totalCount: total };
  }, [typeCounts, filters.status]);

  const handleTypeClick = (type: OpportunityType | null) => {
    if (type === null) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes([type]);
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const container = containerRef.current;
    if (!container) return;
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")
    );
    const currentIndex = buttons.indexOf(e.target as HTMLButtonElement);
    if (currentIndex === -1) return;
    e.preventDefault();
    const nextIndex =
      e.key === "ArrowRight"
        ? (currentIndex + 1) % buttons.length
        : (currentIndex - 1 + buttons.length) % buttons.length;
    buttons[nextIndex].focus();
  }, []);

  if (isLoading) {
    return <OpportunityTypeTabsSkeleton />;
  }

  // Index of the active button (0 = All, 1+ = individual types)
  const activeIndex = isAllSelected ? 0 : OPPORTUNITY_TYPES.indexOf(filters.selectedTypes[0]) + 1;

  return (
    <div
      ref={containerRef}
      className="flex flex-wrap items-center gap-1.5"
      role="toolbar"
      aria-label="Filter by opportunity type"
    >
      <TypeChip
        label="All"
        count={isError ? undefined : totalCount}
        isActive={isAllSelected}
        onClick={() => handleTypeClick(null)}
        tabIndex={activeIndex === 0 ? 0 : -1}
        onKeyDown={handleKeyDown}
      />
      {OPPORTUNITY_TYPES.map((type, idx) => {
        const config = getOpportunityTypeConfig(type);
        const Icon = config.icon;
        const count = isError ? undefined : countsByType?.get(type);

        return (
          <TypeChip
            key={type}
            label={config.label}
            count={count}
            isActive={filters.selectedTypes.includes(type)}
            onClick={() => handleTypeClick(type)}
            icon={<Icon className="h-3.5 w-3.5" />}
            activeColorClass={config.colorClass}
            activeBgClass={config.bgClass}
            activeBorderClass={config.borderClass}
            tabIndex={activeIndex === idx + 1 ? 0 : -1}
            onKeyDown={handleKeyDown}
          />
        );
      })}
      {isError && (
        <span className="flex items-center gap-1 text-xs text-destructive">
          Failed to load counts
          <button
            type="button"
            className="underline hover:no-underline cursor-pointer"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </span>
      )}
    </div>
  );
}

interface TypeChipProps {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  activeColorClass?: string;
  activeBgClass?: string;
  activeBorderClass?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

function TypeChip({
  label,
  count,
  isActive,
  onClick,
  icon,
  activeColorClass,
  activeBgClass,
  activeBorderClass,
  tabIndex = 0,
  onKeyDown,
}: TypeChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? cn(
              activeBgClass || "bg-primary/10",
              activeBorderClass || "border-primary",
              activeColorClass || "text-primary"
            )
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn("text-xs tabular-nums", isActive ? "opacity-80" : "opacity-60")}>
          {count}
        </span>
      )}
    </button>
  );
}

export function OpportunityTypeTabsSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Skeleton className="h-8 w-14 rounded-full" />
      <Skeleton className="h-8 w-24 rounded-full" />
      <Skeleton className="h-8 w-28 rounded-full" />
      <Skeleton className="h-8 w-22 rounded-full" />
      <Skeleton className="h-8 w-28 rounded-full" />
      <Skeleton className="h-8 w-24 rounded-full" />
      <Skeleton className="h-8 w-18 rounded-full" />
    </div>
  );
}
