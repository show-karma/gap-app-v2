"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utilities/tailwind";
import { OPPORTUNITY_TYPES } from "../constants/filter-options";
import { useFundingFilters } from "../hooks/use-funding-filters";
import { useTypeCounts } from "../hooks/use-funding-programs";
import type { OpportunityType } from "../types/funding-program";
import { getOpportunityTypeConfig } from "../utils/opportunity-type-config";

export function OpportunityTypeTabs() {
  const { filters, setSelectedTypes } = useFundingFilters();
  const { data: typeCounts, isLoading, isError } = useTypeCounts();

  const isAllSelected = filters.selectedTypes.length === 0;

  const getCount = (type: OpportunityType): number | undefined => {
    if (!typeCounts) return undefined;
    const found = typeCounts.find((tc) => tc.type === type);
    return found?.count;
  };

  const totalCount = typeCounts?.reduce((sum, tc) => sum + tc.count, 0);

  const handleTypeClick = (type: OpportunityType | null) => {
    if (type === null) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes([type]);
    }
  };

  if (isLoading) {
    return <OpportunityTypeTabsSkeleton />;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <TypeChip
        label="All"
        count={isError ? undefined : totalCount}
        isActive={isAllSelected}
        onClick={() => handleTypeClick(null)}
      />
      {OPPORTUNITY_TYPES.map((type) => {
        const config = getOpportunityTypeConfig(type);
        const Icon = config.icon;
        const count = isError ? undefined : getCount(type);

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
          />
        );
      })}
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
}: TypeChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
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
