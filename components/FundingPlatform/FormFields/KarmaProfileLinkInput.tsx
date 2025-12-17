"use client";

import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";
import debounce from "lodash.debounce";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import type { Control, FieldError } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { useProject } from "@/hooks/useProject";
import { useProjectSearch } from "@/hooks/useProjectSearch";
import type { SearchProjectResult } from "@/services/unified-search.service";
import type { IFormField } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

interface KarmaProfileLinkInputProps {
  field: IFormField;
  control: Control<any>;
  fieldKey: string;
  error?: FieldError | any;
  isLoading?: boolean;
}

export const KarmaProfileLinkInput: FC<KarmaProfileLinkInputProps> = ({
  field,
  control,
  fieldKey,
  error,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<SearchProjectResult | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Watch the form value at top level (required for hooks rules)
  const formValue = useWatch({ control, name: fieldKey });

  // Fetch existing project details for edit mode display
  const shouldFetchProject =
    !selectedProject &&
    formValue &&
    typeof formValue === "string" &&
    /^0x[a-fA-F0-9]{64}$/.test(formValue);

  const { project: existingProject } = useProject(shouldFetchProject ? formValue : "");

  // Determine which project to display (user-selected takes priority over existing)
  const displayProject =
    selectedProject ||
    (existingProject
      ? {
          uid: existingProject.uid,
          chainID: existingProject.chainID,
          createdAt: existingProject.createdAt || "",
          details: {
            title: existingProject.details?.title || "Untitled Project",
            slug: existingProject.details?.slug || "",
            logoUrl: existingProject.details?.logoUrl || undefined,
          },
        }
      : null);

  // Use the React Query hook
  const {
    projects,
    isLoading: isSearching,
    isFetching,
  } = useProjectSearch(debouncedQuery, {
    enabled: debouncedQuery.length >= 3,
  });

  // Debounce the search query
  const debouncedSetQuery = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedQuery(value);
      }, 500),
    []
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSetQuery.cancel();
    };
  }, [debouncedSetQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);

      if (!isInsideContainer && !isInsideDropdown) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Open dropdown when search results arrive
  useEffect(() => {
    if (projects.length > 0 && debouncedQuery.length >= 3) {
      setIsDropdownOpen(true);
    }
  }, [projects, debouncedQuery]);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    debouncedSetQuery(value);
  };

  const handleSelectProject = (project: SearchProjectResult, onChange: (value: string) => void) => {
    setSelectedProject(project);
    setSearchQuery("");
    setDebouncedQuery("");
    setIsDropdownOpen(false);
    onChange(project.uid);
  };

  const handleClear = (onChange: (value: string) => void) => {
    setSelectedProject(null);
    setSearchQuery("");
    setDebouncedQuery("");
    setIsDropdownOpen(false);
    onChange("");
  };

  return (
    <Controller
      name={fieldKey}
      control={control}
      render={({ field: { onChange, value } }) => {
        const hasValue = value && typeof value === "string" && value.length > 0;
        const showClearButton = displayProject || hasValue;

        return (
          <div className="flex w-full flex-col" ref={containerRef}>
            <label htmlFor={fieldKey} className="text-sm font-bold text-black dark:text-zinc-100">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {field.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{field.description}</p>
            )}

            <div className="relative mt-2">
              {/* Search Input */}
              <div className="relative flex items-center">
                <MagnifyingGlassIcon className="absolute left-3 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                <input
                  id={fieldKey}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => {
                    if (projects.length > 0 && debouncedQuery.length >= 3) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  disabled={isLoading}
                  className={cn(
                    "w-full rounded-lg border border-gray-200 bg-white pl-10 pr-10 py-3",
                    "text-gray-900 placeholder:text-gray-400",
                    "dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    error && "border-red-500 dark:border-red-500"
                  )}
                  placeholder={field.placeholder || "Search for your Karma project..."}
                />
                {showClearButton && (
                  <button
                    type="button"
                    onClick={() => handleClear(onChange)}
                    disabled={isLoading}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Selected Project Display */}
              {displayProject && (
                <div className="mt-2 flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <ProfilePicture
                    imageURL={displayProject.details?.logoUrl}
                    name={displayProject.uid || ""}
                    className="w-10 h-10 flex-shrink-0"
                    alt={displayProject.details?.title || "Project"}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {displayProject.details?.title || "Untitled Project"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {displayProject.details?.slug || displayProject.uid}
                    </p>
                  </div>
                </div>
              )}

              {/* Dropdown with Search Results */}
              {isDropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-[9999] max-h-64 overflow-y-auto"
                >
                  {isSearching || isFetching ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      {debouncedQuery.length < 3
                        ? "Type at least 3 characters to search"
                        : "No projects found"}
                    </div>
                  ) : (
                    <div className="py-1">
                      {projects.map((project) => (
                        <button
                          key={project.uid}
                          type="button"
                          onClick={() => handleSelectProject(project, onChange)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors text-left"
                        >
                          <ProfilePicture
                            imageURL={project.details?.logoUrl}
                            name={project.uid || ""}
                            className="w-10 h-10 flex-shrink-0"
                            alt={project.details?.title || "Project"}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {project.details?.title || "Untitled Project"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {project.details?.slug || `${project.uid.slice(0, 10)}...`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-500 mt-1">
                {error.message || "This field is required"}
              </p>
            )}
          </div>
        );
      }}
    />
  );
};
