"use client";

import { useState, useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ProjectCard from "@/components/Project/ProjectCard";
import {
  useExplorerProjects,
  useExplorerCommunities,
} from "@/hooks/useExplorerProjects";
import { Community } from "@/services/explorerProjects";
import Image from "next/image";

const PAGE_SIZE = 12;

export default function BrowseProjects() {
  // Use our custom hooks
  const {
    projects,
    totalProjects,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    autoLoadEnabled,
    showingSeeAllButton,
    searchTerm,
    selectedCommunities,
    handleSearchChange,
    addCommunityFilter,
    removeCommunityFilter,
    toggleCommunity,
    clearCommunities,
    handleSortChange,
    handleSeeAll,
  } = useExplorerProjects(PAGE_SIZE);

  const { data: communities = [], isLoading: isLoadingCommunities } =
    useExplorerCommunities();

  // State for community dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Setup intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0.1,
  });

  // Load more projects when scrolling to the bottom, but only if auto-loading is enabled
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && autoLoadEnabled) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, autoLoadEnabled]);

  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleSearchChange(value);
  };

  // Helper to check if a community is selected
  const isCommunitySelected = (community: Community) => {
    return selectedCommunities.some((c) => c.uid === community.uid);
  };

  // Get correct image URL based on dark/light mode
  const getImageUrl = (community: Community) => {
    // For now, we'll use the light version always
    // In a real implementation, this would check the theme
    return community.imageURL?.light || "/logos/karma-default.png";
  };

  // Check if community has an image
  const hasImage = (community: Community) => {
    return !!community.imageURL?.light;
  };

  // Get initials or first letter of community name
  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // Generate a consistent color based on community name
  const getColorForCommunity = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-red-500",
      "bg-orange-500",
      "bg-teal-500",
    ];

    // Generate a consistent index based on string
    const charSum = name
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charSum % colors.length];
  };

  return (
    <section id="browse-projects" className="w-full py-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex-1 flex flex-row items-center justify-between gap-4">
          <h2 className="text-3xl font-bold mb-8">Browse Projects</h2>
          <Input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={handleSearchInputChange}
            className="w-full max-w-96 text-black bg-white dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-500"
          />
        </div>

        <div className="flex flex-col md:flex-row justify-end items-center gap-4 mb-8">
          <div className="w-full md:w-48">
            <Select onValueChange={handleSortChange} defaultValue="newest">
              <SelectTrigger className="w-full max-w-48 text-black bg-white dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-500">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="w-full max-w-48 text-black bg-white dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-500">
                <SelectItem
                  value="newest"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                  Newest
                </SelectItem>
                <SelectItem
                  value="oldest"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                  Oldest
                </SelectItem>
                <SelectItem
                  value="name-az"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                  Name A-Z
                </SelectItem>
                <SelectItem
                  value="name-za"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                  Name Z-A
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Community Filter */}
          <div className="relative w-full md:w-auto" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center justify-between w-full md:min-w-[200px] px-4 py-2 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-500 text-black bg-white dark:bg-zinc-900 dark:text-zinc-100`}
            >
              <span>
                {selectedCommunities.length === 0
                  ? "Filter by Community"
                  : `${selectedCommunities.length} ${
                      selectedCommunities.length === 1
                        ? "Community"
                        : "Communities"
                    }`}
              </span>
              <svg
                className={`w-5 h-5 ml-2 transform ${
                  isDropdownOpen ? "rotate-180" : ""
                } transition-transform`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Dropdown Panel */}
            {isDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full md:w-80 bg-white dark:bg-zinc-900 shadow-lg max-h-96 rounded-md overflow-hidden border border-zinc-300 dark:border-zinc-500">
                <div className="sticky top-0 flex justify-between items-center p-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="font-medium text-sm text-black dark:text-white">
                    Communities
                  </span>
                  {selectedCommunities.length > 0 && (
                    <button
                      onClick={() => clearCommunities()}
                      className="text-sm text-black dark:text-white"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto max-h-80 py-1">
                  {communities.map((community) => (
                    <div
                      key={community.uid}
                      onClick={() => toggleCommunity(community)}
                      className={`flex items-center px-3 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                        isCommunitySelected(community)
                          ? "bg-blue-50 dark:bg-zinc-700"
                          : ""
                      }`}
                    >
                      <div className="flex-shrink-0 h-6 w-6 relative overflow-hidden rounded-full">
                        {hasImage(community) ? (
                          <Image
                            src={getImageUrl(community)}
                            alt={community.name}
                            width={24}
                            height={24}
                            className="object-cover"
                          />
                        ) : (
                          <div
                            className={`flex items-center justify-center w-full h-full text-white text-xs font-bold ${getColorForCommunity(
                              community.name
                            )}`}
                          >
                            {getInitial(community.name)}
                          </div>
                        )}
                      </div>
                      <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                        {community.name}
                      </span>
                      <div className="ml-auto">
                        <input
                          type="checkbox"
                          checked={isCommunitySelected(community)}
                          onChange={() => {}}
                          className="h-4 w-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.uid} project={project} />
          ))}

          {/* Loading indicator */}
          {(isLoading || isFetchingNextPage) && (
            <div className="col-span-full flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          )}

          {/* Infinite scroll trigger */}
          <div ref={ref} className="h-10 w-full"></div>
        </div>

        {/* "See all" button */}
        {showingSeeAllButton && (
          <div className="mt-8 text-center">
            <button
              onClick={handleSeeAll}
              className="px-6 py-2 bg-white dark:bg-zinc-600 dark:border-zinc-700 text-black border border-black dark:text-white font-medium rounded-md transition-colors"
            >
              See all projects
            </button>
          </div>
        )}

        {/* No results */}
        {projects.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No projects found</p>
          </div>
        )}
      </div>
    </section>
  );
}
