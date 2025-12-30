"use client";

import { Check, X } from "lucide-react";
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

export function FundingMapFilters() {
  const {
    filters,
    setStatus,
    setCategories,
    setGrantTypes,
    setOnlyOnKarma,
    setOrganizationFilter,
    resetFilters,
  } = useFundingFilters();

  const hasActiveFilters =
    filters.status !== "Active" ||
    filters.categories.length > 0 ||
    filters.grantTypes.length > 0 ||
    !filters.onlyOnKarma ||
    filters.organizationFilter !== null;

  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-border p-3">
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
          <SelectTrigger className="h-8 w-auto gap-1 rounded-lg px-2.5 text-sm shadow-sm">
            <span className="text-muted-foreground">Status:</span>
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

        <Select
          value={filters.categories[0] || "any"}
          onValueChange={(value) => setCategories(value === "any" ? [] : [value])}
        >
          <SelectTrigger className="h-8 w-auto gap-1 rounded-lg px-2.5 text-sm shadow-sm">
            <span className="text-muted-foreground">Category:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any" className="hover:bg-accent hover:text-accent-foreground">
              Any
            </SelectItem>
            {FUNDING_MAP_CATEGORIES.map((category) => (
              <SelectItem
                key={category}
                value={category}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.grantTypes[0] || "any"}
          onValueChange={(value) => setGrantTypes(value === "any" ? [] : [value])}
        >
          <SelectTrigger className="h-8 w-auto gap-1 rounded-lg px-2.5 text-sm shadow-sm">
            <span className="text-muted-foreground">Type:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any" className="hover:bg-accent hover:text-accent-foreground">
              Any
            </SelectItem>
            {FUNDING_MAP_GRANT_TYPES.map((type) => (
              <SelectItem
                key={type}
                value={type}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
    </div>
  );
}
