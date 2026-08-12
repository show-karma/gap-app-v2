"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMixpanel } from "@/hooks/useMixpanel";
import { cn } from "@/utilities/tailwind";
import { useFundingFilters } from "../hooks/use-funding-filters";

const SEARCH_DEBOUNCE_MS = 300;

const QUICK_SEARCH_CATEGORIES = [
  "GameFi",
  "Communities",
  "DeFi",
  "NFT",
  "Infrastructure",
  "AI",
  "Research",
  "DeSci",
] as const;

export function FundingMapSearch() {
  const { filters, setSearch, toggleCategory } = useFundingFilters();
  const { mixpanel } = useMixpanel("karma");
  const [inputValue, setInputValue] = useState(filters.search);
  const setSearchRef = useRef(setSearch);
  const reportEventRef = useRef(mixpanel.reportEvent);
  const previousQueryRef = useRef(filters.search);

  useEffect(() => {
    setSearchRef.current = setSearch;
  }, [setSearch]);

  useEffect(() => {
    reportEventRef.current = mixpanel.reportEvent;
  }, [mixpanel.reportEvent]);

  const debouncedSetSearch = useRef(
    debounce((value: string) => {
      setSearchRef.current(value);

      if (value) {
        reportEventRef.current({
          event: "funding-map:search",
          properties: {
            queryLength: value.length,
          },
        });
      } else if (previousQueryRef.current) {
        reportEventRef.current({
          event: "funding-map:search-clear",
          properties: {
            previousQueryLength: previousQueryRef.current.length,
          },
        });
      }
      previousQueryRef.current = value;
    }, SEARCH_DEBOUNCE_MS)
  ).current;

  useEffect(() => {
    return () => {
      debouncedSetSearch.cancel();
    };
  }, [debouncedSetSearch]);

  useEffect(() => {
    setInputValue(filters.search);
    previousQueryRef.current = filters.search;
  }, [filters.search]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  const handleCategoryClick = useCallback(
    (tag: string) => {
      const isSelected = filters.categories.includes(tag);
      toggleCategory(tag);
      mixpanel.reportEvent({
        event: "funding-map:quick-category-click",
        properties: {
          category: tag,
          selected: !isSelected,
          totalSelected: isSelected ? filters.categories.length - 1 : filters.categories.length + 1,
        },
      });
    },
    [filters.categories, toggleCategory, mixpanel]
  );

  // The section wrapper and <h1> live in app/funding-map/page.tsx (server
  // component, outside the Suspense boundary) so the heading stays in the
  // initially visible HTML for no-JS readers (DEV-612). This component renders
  // only the interactive pieces: the search input and the quick categories.
  return (
    <>
      <div className="relative w-full">
        <div
          className={cn(
            "flex w-full items-center justify-between gap-2",
            "rounded-full px-4 py-2",
            "shadow-[0_-26px_74px_0_rgba(110,231,183,1)]"
          )}
        >
          <div className="flex flex-1 items-center gap-2">
            <MagnifyingGlassIcon className="h-5 w-5 flex-shrink-0" />
            {/* Persistent label: the placeholder disappears once the field has
                a value, leaving the control unnamed for assistive tech. */}
            <Input
              type="text"
              aria-label="Search funding opportunities"
              placeholder="Search opportunities"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              className="h-auto border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      {/* Native <button> per category, not a clickable <Badge>: these toggle a
          filter, so they need keyboard focus, Enter/Space activation and a
          pressed state that assistive tech can read. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {QUICK_SEARCH_CATEGORIES.map((tag) => {
          const isSelected = filters.categories.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleCategoryClick(tag)}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Badge
                variant="outline"
                className={cn(
                  "cursor-pointer rounded-full border-border px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted transition-colors",
                  isSelected &&
                    "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                )}
              >
                {tag}
              </Badge>
            </button>
          );
        })}
      </div>
    </>
  );
}
