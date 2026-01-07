"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [inputValue, setInputValue] = useState(filters.search);
  const setSearchRef = useRef(setSearch);

  useEffect(() => {
    setSearchRef.current = setSearch;
  }, [setSearch]);

  const debouncedSetSearch = useRef(
    debounce((value: string) => setSearchRef.current(value), SEARCH_DEBOUNCE_MS)
  ).current;

  useEffect(() => {
    return () => {
      debouncedSetSearch.cancel();
    };
  }, [debouncedSetSearch]);

  useEffect(() => {
    setInputValue(filters.search);
  }, [filters.search]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  return (
    <section className="flex w-full justify-center my-16">
      <div className="flex w-full max-w-xl flex-col gap-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-center text-3xl font-semibold tracking-tight lg:text-4xl">
            {`Find funding for your project`}
          </h1>

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
                <Input
                  type="text"
                  placeholder="Search opportunities"
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="h-auto border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {QUICK_SEARCH_CATEGORIES.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={cn(
                  "cursor-pointer rounded-full border-border px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted transition-colors",
                  filters.categories.includes(tag) &&
                    "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                )}
                onClick={() => toggleCategory(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
