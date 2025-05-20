"use client";
import { useEffect, useState } from "react";
import { MultiSelect } from "@/components/Utilities/MultiSelect";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface FilterOption {
  value: string;
  label: string;
}

interface RoadmapFilterProps {
  onChange?: (selectedFilters: string[]) => void;
  className?: string;
}

export const FILTER_OPTIONS: FilterOption[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending Milestones" },
  { value: "completed", label: "Completed Milestones" },
  { value: "impacts", label: "Project Impacts" },
  { value: "activities", label: "Project Activities" },
  { value: "updates", label: "Grant Updates" },
];

export const RoadmapFilter = ({ onChange, className }: RoadmapFilterProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse the filter parameter from URL
  const getInitialFilters = () => {
    const filterParam = searchParams.get("filter");
    if (!filterParam) return ["all"];
    return filterParam.split(",");
  };

  const [selectedFilters, setSelectedFilters] = useState<string[]>(
    getInitialFilters()
  );

  // Update URL when filters change
  const updateUrl = (filters: string[]) => {
    const params = new URLSearchParams(searchParams.toString());

    if (
      filters.length === 0 ||
      (filters.length === 1 && filters[0] === "all")
    ) {
      params.delete("filter");
    } else {
      params.set("filter", filters.join(","));
    }

    router.replace(`${pathname}?${params.toString()}`);
  };

  // Handle filter selection change
  const handleFilterChange = (newFilters: string[]) => {
    // If "All" is selected, clear other selections
    if (newFilters.includes("all") && newFilters.length > 1) {
      const filtersWithoutAll = newFilters.filter((f) => f !== "all");
      if (selectedFilters.includes("all")) {
        // User selected something else while "All" was selected
        setSelectedFilters(filtersWithoutAll);
        updateUrl(filtersWithoutAll);
        onChange?.(filtersWithoutAll);
        return;
      } else {
        // User selected "All" while other filters were selected
        setSelectedFilters(["all"]);
        updateUrl(["all"]);
        onChange?.(["all"]);
        return;
      }
    }

    // Handle empty selection - default back to "All"
    if (newFilters.length === 0) {
      setSelectedFilters(["all"]);
      updateUrl(["all"]);
      onChange?.(["all"]);
      return;
    }

    setSelectedFilters(newFilters);
    updateUrl(newFilters);
    onChange?.(newFilters);
  };

  // Sync with URL params on mount or when URL changes
  useEffect(() => {
    const currentFilters = getInitialFilters();
    if (JSON.stringify(currentFilters) !== JSON.stringify(selectedFilters)) {
      setSelectedFilters(currentFilters);
      onChange?.(currentFilters);
    }
  }, [searchParams]);

  return (
    <div className={className}>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by type:
        </label>
        <MultiSelect
          options={FILTER_OPTIONS}
          onChange={handleFilterChange}
          value={selectedFilters}
          placeholder="Filter roadmap items..."
          className="w-full min-w-[280px] bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700"
        />
      </div>
    </div>
  );
};
