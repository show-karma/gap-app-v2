"use client";

import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMixpanel } from "@/hooks/useMixpanel";
import { cn } from "@/utilities/tailwind";
import {
  FUNDING_MAP_CATEGORIES,
  FUNDING_MAP_STATUSES,
  OPPORTUNITY_TO_GRANT_TYPE,
  OPPORTUNITY_TYPE_LABELS,
  OPPORTUNITY_TYPE_SINGULAR_LABELS,
  UNIFIED_TYPE_OPTIONS,
  type UnifiedTypeOption,
} from "../constants/filter-options";
import { useFundingFilters } from "../hooks/use-funding-filters";
import { useTypeCounts } from "../hooks/use-funding-programs";
import type { OpportunityType } from "../types/funding-program";
import { getGrantTypeConfig } from "../utils/grant-type-config";
import { getOpportunityTypeConfig } from "../utils/opportunity-type-config";
import { OnKarmaBadge } from "./on-karma-badge";

function getTypeOptionIcon(option: UnifiedTypeOption): React.ReactNode {
  if (option.filterTarget === "type") {
    const grantTypeName = OPPORTUNITY_TO_GRANT_TYPE[option.value as OpportunityType];
    if (grantTypeName) {
      const grantConfig = getGrantTypeConfig(grantTypeName, { iconSize: "sm" });
      return grantConfig?.icon ?? null;
    }
    const config = getOpportunityTypeConfig(option.value as OpportunityType);
    const Icon = config.icon;
    return <Icon className={cn("h-3.5 w-3.5", config.colorClass)} />;
  }
  const config = getGrantTypeConfig(option.value, { iconSize: "sm" });
  return config?.icon ?? null;
}

interface FundingMapFiltersProps {
  totalCount?: number;
}

export function FundingMapFilters({ totalCount = 0 }: FundingMapFiltersProps) {
  const {
    filters,
    setStatus,
    setOnlyOnKarma,
    setCategories,
    setGrantTypes,
    setSelectedTypes,
    toggleCategory,
    toggleGrantType,
    toggleType,
    resetFilters,
  } = useFundingFilters();
  const { mixpanel } = useMixpanel("karma");
  const { categories, grantTypes, status, onlyOnKarma } = filters;

  const { data: typeCounts, isError: typeCountsError } = useTypeCounts({
    onlyOnKarma: filters.onlyOnKarma || undefined,
  });

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const totalTypeSelections = filters.selectedTypes.length + filters.grantTypes.length;

  const hasActiveFilters =
    filters.status !== "Active" ||
    filters.categories.length > 0 ||
    filters.grantTypes.length > 0 ||
    filters.onlyOnKarma ||
    filters.selectedTypes.length > 0;

  // Build result count text based on selected type, using singular when count is 1
  const singleSelectedType =
    filters.selectedTypes.length === 1 ? (filters.selectedTypes[0] as OpportunityType) : null;
  const typeLabel = singleSelectedType
    ? totalCount === 1
      ? OPPORTUNITY_TYPE_SINGULAR_LABELS[singleSelectedType]
      : OPPORTUNITY_TYPE_LABELS[singleSelectedType]
    : null;
  const resultLabel = typeLabel ? typeLabel.toLowerCase() : null;

  const getTypeCount = (type: string): number | undefined => {
    if (!typeCounts) return undefined;
    const found = typeCounts.find((tc) => tc.type === type);
    return found?.count;
  };

  const handleKarmaToggle = useCallback(() => {
    const newValue = !onlyOnKarma;
    setOnlyOnKarma(newValue);
    mixpanel.reportEvent({
      event: "funding-map:filter-karma-toggle",
      properties: { onlyOnKarma: newValue, resultCount: totalCount },
    });
  }, [onlyOnKarma, setOnlyOnKarma, mixpanel, totalCount]);

  const handleStatusChange = useCallback(
    (value: string) => {
      setStatus(value);
      mixpanel.reportEvent({
        event: "funding-map:filter-status",
        properties: { status: value, resultCount: totalCount },
      });
    },
    [setStatus, mixpanel, totalCount]
  );

  const handleCategoryToggle = useCallback(
    (category: string) => {
      const isSelected = categories.includes(category);
      toggleCategory(category);
      mixpanel.reportEvent({
        event: "funding-map:filter-category",
        properties: {
          category,
          selected: !isSelected,
          totalCategoriesSelected: isSelected ? categories.length - 1 : categories.length + 1,
          resultCount: totalCount,
        },
      });
    },
    [categories, toggleCategory, mixpanel, totalCount]
  );

  const handleUnifiedTypeToggle = useCallback(
    (option: (typeof UNIFIED_TYPE_OPTIONS)[number]) => {
      if (option.filterTarget === "type") {
        toggleType(option.value as OpportunityType);
      } else {
        toggleGrantType(option.value);
      }
      mixpanel.reportEvent({
        event: "funding-map:filter-type",
        properties: {
          type: option.value,
          filterTarget: option.filterTarget,
          resultCount: totalCount,
        },
      });
    },
    [toggleType, toggleGrantType, mixpanel, totalCount]
  );

  const handleClearTypes = useCallback(() => {
    setSelectedTypes([]);
    setGrantTypes([]);
  }, [setSelectedTypes, setGrantTypes]);

  const handleClearFilters = useCallback(() => {
    mixpanel.reportEvent({
      event: "funding-map:filters-clear",
      properties: {
        clearedFilters: {
          status,
          categories,
          grantTypes,
          onlyOnKarma,
          selectedTypes: filters.selectedTypes,
        },
      },
    });
    resetFilters();
  }, [status, categories, grantTypes, onlyOnKarma, filters.selectedTypes, resetFilters, mixpanel]);

  const isUnifiedOptionSelected = (option: (typeof UNIFIED_TYPE_OPTIONS)[number]) => {
    if (option.filterTarget === "type") {
      return filters.selectedTypes.includes(option.value as OpportunityType);
    }
    return filters.grantTypes.includes(option.value);
  };

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "cursor-pointer gap-1.5 rounded-full pr-1 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            filters.onlyOnKarma && "border-primary"
          )}
          tabIndex={0}
          role="button"
          aria-label="Toggle only on Karma"
          aria-pressed={filters.onlyOnKarma}
          onClick={handleKarmaToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              if (e.key === " ") {
                e.preventDefault();
              }
              handleKarmaToggle();
            }
          }}
        >
          <div
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded border",
              filters.onlyOnKarma ? "border-primary bg-primary" : "border-border"
            )}
          >
            {filters.onlyOnKarma && <Check className="h-3 w-3 text-primary-foreground" />}
          </div>
          <span className="text-xs font-medium text-foreground">Hosted on Karma</span>
          <OnKarmaBadge />
        </Badge>

        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger
            className={cn(
              "h-8 w-auto gap-1 rounded-lg px-2.5 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground",
              filters.status ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FUNDING_MAP_STATUSES.map((status) => (
              <SelectItem
                key={status}
                value={status}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover.Root open={categoryOpen} onOpenChange={setCategoryOpen}>
          <div className="flex items-center">
            <Popover.Trigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 w-auto gap-1.5 text-sm font-normal shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                  filters.categories.length > 0
                    ? "rounded-l-lg rounded-r-none px-2.5"
                    : "rounded-lg px-2.5"
                )}
              >
                <span
                  className={cn(
                    filters.categories.length > 0 ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  Category
                </span>
                {filters.categories.length > 0 ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {filters.categories.length}
                  </span>
                ) : (
                  <ChevronDown className="h-4 w-4 opacity-50" />
                )}
              </Button>
            </Popover.Trigger>
            {filters.categories.length > 0 && (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-r-lg border border-l-0 border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                onClick={() => setCategories([])}
                aria-label="Clear category filters"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={4}
              className="z-50 w-56 rounded-md border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            >
              <div className="max-h-80 overflow-y-auto p-1">
                {/* Selected items at the top */}
                {filters.categories.length > 0 && (
                  <>
                    {filters.categories.map((category) => (
                      <button
                        type="button"
                        key={`selected-${category}`}
                        className="flex w-full items-center gap-2 cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleCategoryToggle(category)}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded border",
                            "border-primary bg-primary"
                          )}
                        >
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <span>{category}</span>
                      </button>
                    ))}
                    <div className="-mx-1 my-1 h-px bg-muted" />
                  </>
                )}

                {/* Full list of all items */}
                {FUNDING_MAP_CATEGORIES.map((category) => (
                  <button
                    type="button"
                    key={`all-${category}`}
                    className="flex w-full items-center gap-2 cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleCategoryToggle(category)}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border",
                        filters.categories.includes(category)
                          ? "border-primary bg-primary"
                          : "border-border"
                      )}
                    >
                      {filters.categories.includes(category) && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span>{category}</span>
                  </button>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root open={typeOpen} onOpenChange={setTypeOpen}>
          <div className="flex items-center">
            <Popover.Trigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 w-auto gap-1.5 text-sm font-normal shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                  totalTypeSelections > 0
                    ? "rounded-l-lg rounded-r-none px-2.5"
                    : "rounded-lg px-2.5"
                )}
              >
                <span
                  className={cn(
                    totalTypeSelections > 0 ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  Types
                </span>
                {totalTypeSelections > 0 ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {totalTypeSelections}
                  </span>
                ) : (
                  <ChevronDown className="h-4 w-4 opacity-50" />
                )}
              </Button>
            </Popover.Trigger>
            {totalTypeSelections > 0 && (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-r-lg border border-l-0 border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                onClick={handleClearTypes}
                aria-label="Clear type filters"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={4}
              className="z-50 w-64 rounded-md border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            >
              <div className="max-h-80 overflow-y-auto p-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Opportunity Types
                </div>
                {UNIFIED_TYPE_OPTIONS.filter((o) => o.section === "opportunityTypes").map(
                  (option) => {
                    const count = getTypeCount(option.value);
                    return (
                      <button
                        type="button"
                        key={option.value}
                        className="flex w-full items-center gap-2 cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleUnifiedTypeToggle(option)}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded border",
                            isUnifiedOptionSelected(option)
                              ? "border-primary bg-primary"
                              : "border-border"
                          )}
                        >
                          {isUnifiedOptionSelected(option) && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        {getTypeOptionIcon(option)}
                        <span className="flex-1 text-left">{option.label}</span>
                        {count !== undefined && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            ({count})
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
                <div className="-mx-1 my-1 h-px bg-muted" />
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Funding Mechanisms
                </div>
                {UNIFIED_TYPE_OPTIONS.filter((o) => o.section === "fundingMechanisms").map(
                  (option) => {
                    const count = getTypeCount(option.value);
                    return (
                      <button
                        type="button"
                        key={option.value}
                        className="flex w-full items-center gap-2 cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleUnifiedTypeToggle(option)}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded border",
                            isUnifiedOptionSelected(option)
                              ? "border-primary bg-primary"
                              : "border-border"
                          )}
                        >
                          {isUnifiedOptionSelected(option) && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        {getTypeOptionIcon(option)}
                        <span className="flex-1 text-left">{option.label}</span>
                        {count !== undefined && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            ({count})
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
                {typeCountsError && (
                  <div className="px-2 py-1.5 text-xs text-destructive">Failed to load counts</div>
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
            onClick={handleClearFilters}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground px-2">
        {totalCount} {resultLabel ? `${resultLabel} ` : ""}
        {totalCount === 1 ? "result" : "results"}
      </div>
    </div>
  );
}
