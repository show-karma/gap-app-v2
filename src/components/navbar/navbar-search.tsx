"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import debounce from "lodash.debounce";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { type UnifiedSearchResponse, unifiedSearch } from "@/services/unified-search.service";
import type { Community } from "@/types/v2/community";
import { groupSimilarCommunities } from "@/utilities/communityHelpers";
import { PAGES } from "@/utilities/pages";

interface NavbarSearchProps {
  onSelectItem?: () => void;
}

export function NavbarSearch({ onSelectItem }: NavbarSearchProps = {}) {
  const [results, setResults] = useState<UnifiedSearchResponse>({
    communities: [],
    projects: [],
  });
  const [isSearchListOpen, setIsSearchListOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");
  const searchRef = useRef<HTMLDivElement>(null);

  // Click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchListOpen(false);
      }
    };

    if (isSearchListOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearchListOpen]);

  // Create debounced search function only once using useMemo
  const debouncedSearch = useMemo(
    () =>
      debounce(async (value: string) => {
        if (value.length < 3) {
          setResults({ communities: [], projects: [] });
          setIsSearchListOpen(false);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setIsSearchListOpen(true);
        try {
          const result = await unifiedSearch(value);
          setResults(result);
        } catch {
          setResults({ communities: [], projects: [] });
        } finally {
          setIsLoading(false);
        }
      }, 500),
    []
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleInputChange = (value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleSelectItem = () => {
    setIsSearchListOpen(false);
    setSearchValue("");
    setResults({ communities: [], projects: [] });
    onSelectItem?.();
  };

  const groupedCommunities = groupSimilarCommunities(results.communities as Community[]);
  const totalResults = results.projects.length + groupedCommunities.length;

  return (
    <div className="relative flex-1 min-w-20 md:max-w-[240px]" ref={searchRef}>
      <div className="relative flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-md bg-background w-full transition-[box-shadow,border-color,background-color] duration-100 ease-in-out focus-within:bg-background focus-within:border-foreground/20 focus-within:ring-2 focus-within:ring-border hover:bg-secondary focus-within:hover:bg-background cursor-text">
        <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search Project/Community"
          className="w-full flex-1 text-sm bg-transparent text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-0 p-0 min-w-0"
          value={searchValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (totalResults > 0) {
              setIsSearchListOpen(true);
            }
          }}
        />
      </div>

      {isSearchListOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-full min-w-[350px] max-w-[500px] sm:max-w-[500px] bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden"
          style={{ width: "min(100%, 500px)", minWidth: "350px" }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            </div>
          ) : totalResults === 0 && searchValue.length >= 3 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No results found.</div>
          ) : (
            <div className="max-h-72 w-full overflow-y-auto overflow-x-hidden">
              <div
                className="flex flex-col gap-1 py-3 px-3 min-w-0 w-full"
                style={{ maxWidth: "100%", boxSizing: "border-box" }}
              >
                {groupedCommunities.map((community) => {
                  const name = community.details?.name || "Untitled Community";
                  const imageURL = community.details?.imageURL;
                  const slug = community.details?.slug || community.uid;

                  return (
                    <Link
                      key={community.uid}
                      href={PAGES.COMMUNITY.ALL_GRANTS(slug)}
                      onClick={handleSelectItem}
                      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors min-w-0 w-full max-w-full overflow-hidden"
                    >
                      <ProfilePicture
                        imageURL={imageURL}
                        name={community.uid || ""}
                        className="w-8 h-8 flex-shrink-0"
                        alt={name}
                      />
                      <span className="font-medium text-foreground truncate flex-1 min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                        {name}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-medium rounded flex-shrink-0 whitespace-nowrap ml-auto">
                        Community
                      </span>
                    </Link>
                  );
                })}
                {results.projects.map((project) => {
                  const title = project.details?.title || "Untitled Project";
                  const imageURL = project.details?.logoUrl;
                  const slug = project.details?.slug || project.uid;

                  return (
                    <Link
                      key={project.uid}
                      href={PAGES.PROJECT.GRANTS(slug)}
                      onClick={handleSelectItem}
                      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors min-w-0 w-full max-w-full overflow-hidden"
                    >
                      <ProfilePicture
                        imageURL={imageURL}
                        name={project.uid || ""}
                        className="w-8 h-8 flex-shrink-0"
                        alt={title}
                      />
                      <span className="font-medium text-foreground truncate flex-1 min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                        {title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
