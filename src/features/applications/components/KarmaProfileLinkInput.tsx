"use client";

import { ExternalLink, Loader2, Plus, Search, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Control, FieldPath } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEARCH_CONSTANTS } from "@/constants/search";
import { useProjectSearch } from "@/hooks/useProjectSearch";
import type { SearchProjectResult } from "@/services/unified-search.service";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import { envVars } from "@/utilities/enviromentVars";
import type { ApplicationFormData } from "../types";

function AddProjectLink() {
  const href = `${envVars.VERCEL_URL || "https://www.karmahq.xyz"}?action=create-project`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="add-project-link"
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent text-left w-full"
    >
      <div className="w-10 h-10 rounded-full bg-[rgb(var(--color-primary))]/10 flex items-center justify-center flex-shrink-0">
        <Plus className="w-5 h-5 text-[rgb(var(--color-primary))]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[rgb(var(--color-primary))]">Add project</p>
        <p className="text-xs text-zinc-500">Create a new project on Karma</p>
      </div>
      <ExternalLink className="w-4 h-4 text-zinc-400 flex-shrink-0" />
    </a>
  );
}

interface KarmaProfileLinkInputProps {
  control: Control<ApplicationFormData>;
  name: string;
  question: ApplicationQuestion;
  disabled?: boolean;
}

export const KarmaProfileLinkInput: React.FC<KarmaProfileLinkInputProps> = ({
  control,
  name,
  question,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<SearchProjectResult | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;

  const formValue = useWatch({
    control,
    name: name as FieldPath<ApplicationFormData>,
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, SEARCH_CONSTANTS.DEBOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isWaitingForDebounce =
    searchQuery.length >= SEARCH_CONSTANTS.MIN_QUERY_LENGTH && searchQuery !== debouncedQuery;

  const {
    projects = [],
    isLoading: isSearching,
    isFetching,
    isError: isSearchError,
    refetch: retrySearch,
  } = useProjectSearch(debouncedQuery, {
    enabled: debouncedQuery.length >= SEARCH_CONSTANTS.MIN_QUERY_LENGTH,
  });

  const isLoadingSearch = isWaitingForDebounce || ((isSearching || isFetching) && !selectedProject);

  useEffect(() => {
    if (!isDropdownOpen) setActiveIndex(-1);
  }, [isDropdownOpen]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [projects]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
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

  useEffect(() => {
    if (
      debouncedQuery.length >= SEARCH_CONSTANTS.MIN_QUERY_LENGTH &&
      !isSearching &&
      !isFetching &&
      !selectedProject
    ) {
      setIsDropdownOpen(true);
    }
  }, [projects, debouncedQuery, isSearching, isFetching, selectedProject]);

  const handleSelectProject = useCallback(
    (project: SearchProjectResult, onChange: (value: string) => void) => {
      setSelectedProject(project);
      setSearchQuery(project.details?.title || "");
      setIsDropdownOpen(false);
      setActiveIndex(-1);
      onChange(project.uid);
    },
    []
  );

  const handleClear = useCallback((onChange: (value: string) => void) => {
    setSelectedProject(null);
    setSearchQuery("");
    setIsDropdownOpen(false);
    setActiveIndex(-1);
    onChange("");
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, onChange: (value: string) => void) => {
      if (!isDropdownOpen || projects.length === 0) {
        if (e.key === "Escape" && isDropdownOpen) {
          e.preventDefault();
          setIsDropdownOpen(false);
          setActiveIndex(-1);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, projects.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && projects[activeIndex]) {
            handleSelectProject(projects[activeIndex], onChange);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsDropdownOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isDropdownOpen, projects, activeIndex, handleSelectProject]
  );

  const getOptionId = (index: number) => `${listboxId}-option-${index}`;

  return (
    <Controller
      name={name as FieldPath<ApplicationFormData>}
      control={control}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        const hasValue = field.value && typeof field.value === "string" && field.value.length > 0;
        const showClearButton = selectedProject || hasValue;

        return (
          <div className="flex w-full flex-col" ref={containerRef}>
            <div className="flex flex-col gap-1 mb-2">
              <Label htmlFor={inputId}>
                {question.label}
                {question.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {question.description && (
                <MarkdownPreview source={question.description} className="text-sm text-zinc-500" />
              )}
            </div>

            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  id={inputId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setHasUserInteracted(true);
                    setSearchQuery(e.target.value);
                  }}
                  onFocus={() => {
                    setHasUserInteracted(true);
                    if (debouncedQuery.length >= SEARCH_CONSTANTS.MIN_QUERY_LENGTH) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  onKeyDown={(e) => handleKeyDown(e, field.onChange)}
                  disabled={disabled}
                  placeholder={question.placeholder || "Search for your Karma project..."}
                  className="pl-9 pr-9"
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="listbox"
                  aria-controls={isDropdownOpen ? listboxId : undefined}
                  aria-activedescendant={
                    isDropdownOpen && activeIndex >= 0 ? getOptionId(activeIndex) : undefined
                  }
                  aria-autocomplete="list"
                />
                {isLoadingSearch ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-400" />
                ) : showClearButton && !disabled ? (
                  <button
                    type="button"
                    onClick={() => handleClear(field.onChange)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    aria-label="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>

              {error && <p className="text-sm text-destructive mt-1">{error}</p>}

              {selectedProject && (
                <div className="mt-2 flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-medium">
                    {(selectedProject.details?.title?.[0] || "P").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {selectedProject.details?.title || "Untitled Project"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {selectedProject.details?.slug || selectedProject.uid}
                    </p>
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      data-testid="remove-project-button"
                      onClick={() => handleClear(field.onChange)}
                      className="text-sm text-destructive hover:text-destructive/80 font-medium transition-colors flex-shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}

              {isDropdownOpen && hasUserInteracted && (
                <div
                  ref={dropdownRef}
                  id={listboxId}
                  className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
                >
                  {isSearching || isFetching ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                    </div>
                  ) : isSearchError ? (
                    <div className="py-4 text-center">
                      <p className="text-sm text-destructive">Failed to search projects</p>
                      <button
                        type="button"
                        onClick={() => retrySearch()}
                        className="mt-2 text-sm text-[rgb(var(--color-primary))] hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : projects.length === 0 ? (
                    <div>
                      <div className="py-6 text-center text-sm text-zinc-500">
                        {debouncedQuery.length < SEARCH_CONSTANTS.MIN_QUERY_LENGTH
                          ? `Type at least ${SEARCH_CONSTANTS.MIN_QUERY_LENGTH} characters to search`
                          : "No projects found"}
                      </div>
                      {debouncedQuery.length >= SEARCH_CONSTANTS.MIN_QUERY_LENGTH && (
                        <AddProjectLink />
                      )}
                    </div>
                  ) : (
                    <div>
                      <div role="listbox" aria-label="Project search results" className="py-1">
                        {projects.map((project: SearchProjectResult, index: number) => (
                          <button
                            key={project.uid}
                            id={getOptionId(index)}
                            type="button"
                            role="option"
                            aria-selected={activeIndex === index}
                            onClick={() => handleSelectProject(project, field.onChange)}
                            onMouseEnter={() => setActiveIndex(index)}
                            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                              activeIndex === index ? "bg-accent" : "hover:bg-accent"
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 text-sm font-medium">
                              {(project.details?.title?.[0] || "P").toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {project.details?.title || "Untitled Project"}
                              </p>
                              <p className="text-xs text-zinc-500 truncate">
                                {project.details?.slug || `${project.uid.slice(0, 10)}...`}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                      <AddProjectLink />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }}
    />
  );
};
