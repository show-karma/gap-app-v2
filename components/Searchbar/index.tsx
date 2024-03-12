"use client";

// eslint-disable-next-line import/no-extraneous-dependencies
import debounce from "lodash.debounce";
import { type FC, useState } from "react";

import { SearchList } from "./SearchList";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";

export const Searchbar: FC = () => {
  const [projects, setProjects] = useState<IProjectResponse[]>([]);
  const [isSearchListOpen, setIsSearchListOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const closeSearchList = () => {
    setTimeout(() => {
      setIsSearchListOpen(false);
    }, 200);
  };

  const debouncedSearch = debounce(async (value: string) => {
    if (value.length < 3) {
      setProjects([]);
      return setIsSearchListOpen(false);
    }

    setIsLoading(true);
    setIsSearchListOpen(true);
    const result = await gapIndexerApi.searchProjects(value);
    setProjects(result.data);
    return setIsLoading(false);
  }, 500);

  return (
    <div
      className="relative flex flex-row items-center gap-3 rounded-lg h-max bg-zinc-100 px-4 max-2xl:gap-1 max-2xl:px-2 text-gray-600 dark:text-gray-200 dark:bg-zinc-800"
      onBlur={() => closeSearchList()}
    >
      <MagnifyingGlassIcon className="h-5 w-5" />
      <input
        type="text"
        placeholder="Search projects"
        className="w-full min-w-[160px] bg-transparent placeholder:text-gray-400 px-1 py-2 text-gray-600 dark:text-gray-200 border-none border-b-zinc-800 outline-none focus:ring-0 max-[1300px]:min-w-full max-[1300px]:max-w-[140px]"
        onChange={(e) => debouncedSearch(e.target.value)}
        onFocus={() => projects.length > 0 && setIsSearchListOpen(true)}
      />
      <SearchList
        data={projects}
        isOpen={isSearchListOpen}
        isLoading={isLoading}
      />
    </div>
  );
};
