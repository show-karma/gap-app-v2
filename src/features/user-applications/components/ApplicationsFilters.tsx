"use client";

import { Filter, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ApplicationStatus } from "@/types/whitelabel-entities";
import type { UserApplicationsFilters } from "../types";

interface ApplicationsFiltersProps {
  filters: UserApplicationsFilters;
  programs: Array<{ programId: string; name?: string }>;
  onFiltersChange: (filters: Partial<UserApplicationsFilters>) => void;
  onReset: () => void;
}

const statusOptions: Array<{
  value: ApplicationStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "resubmitted", label: "Resubmitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "revision_requested", label: "Revision Requested" },
];

export function ApplicationsFilters({
  filters,
  programs,
  onFiltersChange,
  onReset,
}: ApplicationsFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.searchQuery || "");
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Debounce search input
  useEffect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      if (searchValue !== filters.searchQuery) {
        onFiltersChange({ searchQuery: searchValue });
      }
    }, 300);
    setDebounceTimer(timer);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Sync local state when filters.searchQuery changes externally (e.g., on reset)
  useEffect(() => {
    if (filters.searchQuery !== undefined) {
      setSearchValue(filters.searchQuery);
    }
  }, [filters.searchQuery]);

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.programId ||
    filters.searchQuery ||
    filters.dateRange;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search applications..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => {
                setSearchValue("");
                onFiltersChange({ searchQuery: "" });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative sm:max-w-xs">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={filters.status || "all"}
            onChange={(e) =>
              onFiltersChange({
                status: e.target.value as ApplicationStatus | "all",
              })
            }
            className="h-10 w-full appearance-none rounded-lg border border-border bg-background pl-9 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
