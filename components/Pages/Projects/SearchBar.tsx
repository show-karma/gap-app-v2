"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export const ProjectsSearchBar = ({
  onSearch,
  placeholder = "Search our Projects",
  initialValue = "",
}: SearchBarProps) => {
  const [value, setValue] = useState(initialValue);

  const debouncedSearch = useMemo(
    () =>
      debounce((searchValue: string) => {
        onSearch(searchValue);
      }, PROJECTS_EXPLORER_CONSTANTS.DEBOUNCE_DELAY_MS),
    [onSearch]
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      debouncedSearch(newValue);
    },
    [debouncedSearch]
  );

  return (
    <div className="relative flex items-center w-full max-w-md">
      <MagnifyingGlassIcon className="absolute left-3 h-5 w-5 text-gray-400" />
      <input
        type="text"
        aria-label="Search projects"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
};
