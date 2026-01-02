"use client";

import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utilities/tailwind";
import {
  FUNDING_MAP_CATEGORIES,
  FUNDING_MAP_GRANT_TYPES,
  FUNDING_MAP_STATUSES,
} from "../constants/filter-options";
import { useFundingFilters } from "../hooks/use-funding-filters";
import { OnKarmaBadge } from "./on-karma-badge";
import { OrganizationFilter } from "./organization-filter";

interface FundingMapFiltersProps {
  totalCount?: number;
}

export function FundingMapFilters({ totalCount = 0 }: FundingMapFiltersProps) {
  const {
    filters,
    setStatus,
    setOnlyOnKarma,
    setOrganizationFilter,
    toggleCategory,
    toggleGrantType,
    resetFilters,
  } = useFundingFilters();

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [categoryHover, setCategoryHover] = useState(false);
  const [typeHover, setTypeHover] = useState(false);

  const hasActiveFilters =
    filters.status !== "Active" ||
    filters.categories.length > 0 ||
    filters.grantTypes.length > 0 ||
    !filters.onlyOnKarma ||
    filters.organizationFilter !== null;

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "cursor-pointer gap-1.5 rounded-full pr-1 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            filters.onlyOnKarma
          )}
          tabIndex={0}
          role="button"
          aria-label="Toggle only on Karma"
          aria-pressed={filters.onlyOnKarma}
          onClick={() => setOnlyOnKarma(!filters.onlyOnKarma)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              if (e.key === " ") {
                e.preventDefault();
              }
              setOnlyOnKarma(!filters.onlyOnKarma);
            }
          }}
        >
          <div
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded border",
              filters.onlyOnKarma ? "border-emerald-500 bg-emerald-500" : "border-border"
            )}
          >
            {filters.onlyOnKarma && <Check className="h-3 w-3 text-white" />}
          </div>
          <span className="text-xs font-medium text-foreground">On Karma</span>
          <OnKarmaBadge />
        </Badge>

        <Select value={filters.status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 w-auto gap-1 rounded-lg px-2.5 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground">
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

        <OrganizationFilter value={filters.organizationFilter} onChange={setOrganizationFilter} />

        <Popover.Root open={categoryOpen} onOpenChange={setCategoryOpen}>
          <Popover.Trigger asChild>
            <Button
              variant="outline"
              className="h-8 w-auto gap-1.5 rounded-lg px-2.5 text-sm font-normal shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
              onMouseEnter={() => setCategoryHover(true)}
              onMouseLeave={() => setCategoryHover(false)}
            >
              <span>Category</span>
              {filters.categories.length > 0 ? (
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetFilters();
                    setCategoryHover(false);
                  }}
                  aria-label="Clear category filters"
                >
                  {categoryHover ? <X className="h-3 w-3" /> : filters.categories.length}
                </button>
              ) : (
                <ChevronDown className="h-4 w-4 opacity-50" />
              )}
            </Button>
          </Popover.Trigger>
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
                        onClick={() => toggleCategory(category)}
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
          <Popover.Trigger asChild>
            <Button
              variant="outline"
              className="h-8 w-auto gap-1.5 rounded-lg px-2.5 text-sm font-normal shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
              onMouseEnter={() => setTypeHover(true)}
              onMouseLeave={() => setTypeHover(false)}
            >
              <span>Type</span>
              {filters.grantTypes.length > 0 ? (
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetFilters();
                    setTypeHover(false);
                  }}
                  aria-label="Clear type filters"
                >
                  {typeHover ? <X className="h-3 w-3" /> : filters.grantTypes.length}
                </button>
              ) : (
                <ChevronDown className="h-4 w-4 opacity-50" />
              )}
            </Button>
          </Popover.Trigger>
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
                    onClick={() => toggleGrantType(type)}
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
            onClick={resetFilters}
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
