"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import type { ISearchResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
// eslint-disable-next-line import/no-extraneous-dependencies
import debounce from "lodash.debounce";
import { type FC, useState } from "react";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { SearchList } from "./SearchList";

export const Searchbar: FC = () => {
  const [results, setResults] = useState<ISearchResponse>({
    communities: [],
    projects: [],
  });
  const [isSearchListOpen, setIsSearchListOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [_isSearchListInteracting, setIsSearchListInteracting] = useState<boolean>(false);

  const closeSearchList = () => {
    setTimeout(() => {
      setIsSearchListOpen(false);
    }, 300);
  };

  const debouncedSearch = debounce(async (value: string) => {
    if (value.length < 3) {
      setResults({ communities: [], projects: [] });
      return setIsSearchListOpen(false);
    }

    setIsLoading(true);
    setIsSearchListOpen(true);
    const result = await gapIndexerApi.search(value);
    setResults(result.data);
    return setIsLoading(false);
  }, 500);

  return (
    <div className="relative flex flex-row items-center gap-3 rounded-lg h-max w-full bg-zinc-100 px-4 max-2xl:gap-1 max-2xl:px-2 text-gray-600 dark:text-gray-200 dark:bg-zinc-800">
      <MagnifyingGlassIcon className="h-5 w-5" />
      <input
        type="text"
        placeholder="Search projects and communities"
        className="w-full min-w-[160px] bg-transparent placeholder:text-gray-400 px-1 py-2 text-gray-600 dark:text-gray-200 border-none border-b-zinc-800 outline-none focus:ring-0"
        onChange={(e) => debouncedSearch(e.target.value)}
        onFocus={() =>
          [...results.projects, ...results.communities].length > 0 && setIsSearchListOpen(true)
        }
      />
      <SearchList
        data={results}
        isOpen={isSearchListOpen}
        isLoading={isLoading}
        closeSearchList={closeSearchList}
        onInteractionStart={() => setIsSearchListInteracting(true)}
        onInteractionEnd={() => setIsSearchListInteracting(false)}
      />
    </div>
  );
};
