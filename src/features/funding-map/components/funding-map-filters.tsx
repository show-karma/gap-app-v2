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
  FUNDING_MAP_GRANT_TYPES,
  FUNDING_MAP_STATUSES,
} from "../constants/filter-options";
import { useFundingFilters } from "../hooks/use-funding-filters";
import { OnKarmaBadge } from "./on-karma-badge";

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
    toggleCategory,
    toggleGrantType,
    resetFilters,
  } = useFundingFilters();
  const { mixpanel } = useMixpanel("karma");

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const hasActiveFilters =
    filters.status !== "Active" ||
    filters.categories.length > 0 ||
    filters.grantTypes.length > 0 ||
    !filters.onlyOnKarma;

  const handleKarmaToggle = useCallback(() => {
    const newValue = !filters.onlyOnKarma;
    setOnlyOnKarma(newValue);
    mixpanel.reportEvent({
      event: "funding-map:filter-karma-toggle",
      properties: { onlyOnKarma: newValue, resultCount: totalCount },
    });
  }, [filters.onlyOnKarma, setOnlyOnKarma, mixpanel, totalCount]);

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
      const isSelected = filters.categories.includes(category);
      toggleCategory(category);
      mixpanel.reportEvent({
        event: "funding-map:filter-category",
        properties: {
          category,
          selected: !isSelected,
          totalCategoriesSelected: isSelected
            ? filters.categories.length - 1
            : filters.categories.length + 1,
          resultCount: totalCount,
        },
      });
    },
    [filters.categories, toggleCategory, mixpanel, totalCount]
  );

  const handleGrantTypeToggle = useCallback(
    (grantType: string) => {
      const isSelected = filters.grantTypes.includes(grantType);
      toggleGrantType(grantType);
      mixpanel.reportEvent({
        event: "funding-map:filter-grant-type",
        properties: {
          grantType,
          selected: !isSelected,
          totalGrantTypesSelected: isSelected
            ? filters.grantTypes.length - 1
            : filters.grantTypes.length + 1,
          resultCount: totalCount,
        },
      });
    },
    [filters.grantTypes, toggleGrantType, mixpanel, totalCount]
  );

  const handleClearFilters = useCallback(() => {
    mixpanel.reportEvent({
      event: "funding-map:filters-clear",
      properties: {
        clearedFilters: {
          status: filters.status,
          categories: filters.categories,
          grantTypes: filters.grantTypes,
          onlyOnKarma: filters.onlyOnKarma,
        },
      },
    });
    resetFilters();
  }, [filters, resetFilters, mixpanel]);

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
                    onClick={() => toggleCategory(category)}
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
                  filters.grantTypes.length > 0
                    ? "rounded-l-lg rounded-r-none px-2.5"
                    : "rounded-lg px-2.5"
                )}
              >
                <span
                  className={cn(
                    filters.grantTypes.length > 0 ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  Type
                </span>
                {filters.grantTypes.length > 0 ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {filters.grantTypes.length}
                  </span>
                ) : (
                  <ChevronDown className="h-4 w-4 opacity-50" />
                )}
              </Button>
            </Popover.Trigger>
            {filters.grantTypes.length > 0 && (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-r-lg border border-l-0 border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                onClick={() => setGrantTypes([])}
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
              className="z-50 w-56 rounded-md border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            >
              <div className="max-h-80 overflow-y-auto p-1">
                {/* Full list of all items */}
                {FUNDING_MAP_GRANT_TYPES.map((type) => (
                  <button
                    type="button"
                    key={type}
                    className="flex w-full items-center gap-2 cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleGrantTypeToggle(type)}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border",
                        filters.grantTypes.includes(type)
                          ? "border-primary bg-primary"
                          : "border-border"
                      )}
                    >
                      {filters.grantTypes.includes(type) && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span>{type}</span>
                  </button>
                ))}
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
        {totalCount} {totalCount === 1 ? "result" : "results"}
      </div>
    </div>
  );
}
