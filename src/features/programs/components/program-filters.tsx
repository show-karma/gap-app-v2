"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ProgramStatus } from "@/types/whitelabel-entities";
import type { ProgramFiltersProps } from "../types";

export function ProgramFilters({ filters, onChange, totalCount }: ProgramFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (searchValue !== filters.search) {
        onChange({ ...filters, search: searchValue || undefined });
      }
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [searchValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external filter changes
  useEffect(() => {
    if (filters.search !== searchValue) {
      setSearchValue(filters.search || "");
    }
  }, [filters.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "all") {
      const { status, ...rest } = filters;
      onChange(rest);
    } else {
      onChange({ ...filters, status: value as ProgramStatus });
    }
  };

  const handleClearFilters = () => {
    setSearchValue("");
    onChange({});
  };

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => filters[key as keyof typeof filters] !== undefined
  ).length;

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search programs..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-48">
          <label htmlFor="wl-status-filter" className="sr-only">
            Status
          </label>
          <select
            id="wl-status-filter"
            aria-label="Status"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            value={filters.status || "all"}
            onChange={handleStatusChange}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="ended">Ended</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        <button
          type="button"
          onClick={handleClearFilters}
          disabled={!hasActiveFilters}
          className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear Filters
        </button>
      </div>

      {/* Filter Status Bar */}
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {totalCount !== undefined ? (
            <span>
              {totalCount} {totalCount === 1 ? "program" : "programs"} found
            </span>
          ) : null}
        </div>

        {hasActiveFilters ? (
          <div className="flex items-center gap-2">
            <span>Active filters:</span>
            <span
              data-testid="active-filters-count"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
            >
              {activeFiltersCount}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
