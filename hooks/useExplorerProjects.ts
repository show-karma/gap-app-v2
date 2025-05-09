"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  explorerProjectsService,
  GetExplorerProjectsParams,
  Community,
} from "@/services/explorerProjects";
import { useState, useCallback } from "react";
import { debounce } from "lodash";

// Query keys
export const EXPLORER_PROJECTS_QUERY_KEYS = {
  all: ["explorer-projects"] as const,
  list: (filters: Partial<GetExplorerProjectsParams>) =>
    [...EXPLORER_PROJECTS_QUERY_KEYS.all, "list", filters] as const,
  communities: () =>
    [...EXPLORER_PROJECTS_QUERY_KEYS.all, "communities"] as const,
};

/**
 * Hook to fetch explorer projects with infinite loading, sorting and filtering
 */
export const useExplorerProjects = (
  pageSize: number = 12,
  initialSortBy: string = "createdAt",
  initialSortOrder: "asc" | "desc" = "desc",
  initialItemsToShow: number = pageSize
) => {
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCommunities, setSelectedCommunities] = useState<Community[]>(
    []
  );
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  // State to control whether infinite loading is enabled
  const [autoLoadEnabled, setAutoLoadEnabled] = useState(false);
  // State to limit initial items shown
  const [itemLimit, setItemLimit] = useState(initialItemsToShow);

  // Create debounced search function
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchTerm(value);
    }, 500),
    []
  );

  // Update search term and trigger debounced search
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Add a community to filter
  const addCommunityFilter = (community: Community) => {
    if (!selectedCommunities.some((c) => c.uid === community.uid)) {
      setSelectedCommunities([...selectedCommunities, community]);
    }
  };

  // Remove a community from filter
  const removeCommunityFilter = (communityUid: string) => {
    setSelectedCommunities(
      selectedCommunities.filter((c) => c.uid !== communityUid)
    );
  };

  // Add multiple communities at once
  const addCommunitiesFilter = (communities: Community[]) => {
    const currentUids = selectedCommunities.map((c) => c.uid);
    const newCommunities = communities.filter(
      (c) => !currentUids.includes(c.uid)
    );

    if (newCommunities.length > 0) {
      setSelectedCommunities([...selectedCommunities, ...newCommunities]);
    }
  };

  // Toggle community selection
  const toggleCommunity = (community: Community) => {
    if (selectedCommunities.some((c) => c.uid === community.uid)) {
      removeCommunityFilter(community.uid);
    } else {
      addCommunityFilter(community);
    }
  };

  // Clear all selected communities
  const clearCommunities = () => {
    setSelectedCommunities([]);
  };

  // Handle sort changes
  const handleSortChange = (value: string) => {
    if (value === "newest") {
      setSortBy("createdAt");
      setSortOrder("desc");
    } else if (value === "oldest") {
      setSortBy("createdAt");
      setSortOrder("asc");
    } else if (value === "name-az") {
      setSortBy("name");
      setSortOrder("asc");
    } else if (value === "name-za") {
      setSortBy("name");
      setSortOrder("desc");
    }
  };

  // Function to enable infinite loading and show all items
  const handleSeeAll = () => {
    setAutoLoadEnabled(true);
    setItemLimit(Number.MAX_SAFE_INTEGER);
  };

  // Extract UIDs from selected communities for API call
  const selectedCommunityUids = selectedCommunities.map((c) => c.uid);

  // Create query params
  const queryParams: GetExplorerProjectsParams = {
    pageSize,
    page: 0,
    sortBy,
    sortOrder,
    name: debouncedSearchTerm !== "" ? debouncedSearchTerm : undefined,
    communities:
      selectedCommunityUids.length > 0 ? selectedCommunityUids : undefined,
  };

  // Use infinite query
  const query = useInfiniteQuery({
    queryKey: EXPLORER_PROJECTS_QUERY_KEYS.list(queryParams),
    queryFn: ({ pageParam = 0 }) =>
      explorerProjectsService.getExplorerProjects({
        ...queryParams,
        page: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      return lastPage.projects.length === pageSize
        ? lastPage.nextOffset
        : undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get all projects from all pages
  const allProjects = query.data?.pages.flatMap((page) => page.projects) || [];

  // If itemLimit is set, only return the limited number of projects
  const limitedProjects =
    itemLimit < allProjects.length
      ? allProjects.slice(0, itemLimit)
      : allProjects;

  return {
    ...query,
    // Projects with potential limit applied
    projects: limitedProjects,
    // Total number of projects (without limit)
    totalProjects: allProjects.length,
    // State for display control
    autoLoadEnabled,
    showingSeeAllButton:
      !autoLoadEnabled && limitedProjects.length < allProjects.length,
    // State and handlers for filters
    searchTerm,
    selectedCommunities,
    sortBy,
    sortOrder,
    // Actions
    handleSearchChange,
    addCommunityFilter,
    removeCommunityFilter,
    addCommunitiesFilter,
    toggleCommunity,
    clearCommunities,
    handleSortChange,
    handleSeeAll,
  };
};

/**
 * Hook to fetch communities for filtering
 */
export const useExplorerCommunities = () => {
  return useQuery({
    queryKey: EXPLORER_PROJECTS_QUERY_KEYS.communities(),
    queryFn: () => explorerProjectsService.getCommunities(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};
