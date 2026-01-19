"use client";

import { useQueryState } from "nuqs";
import { useMemo } from "react";
import { useProjectsExplorer } from "@/hooks/useProjectsExplorer";
import type { ExplorerSortByOptions, ExplorerSortOrder } from "@/types/explorer";
import type { Project } from "@/types/v2/project";
import { ProjectsLoading } from "./Loading";
import { ProjectCard } from "./ProjectCard";
import { SortDropdown } from "./SortDropdown";

/**
 * Sort projects client-side based on sort options
 * V2 API doesn't support sorting, so we sort after fetching
 */
const sortProjects = (
  projects: Project[],
  sortBy: ExplorerSortByOptions,
  sortOrder: ExplorerSortOrder
): Project[] => {
  const sorted = [...projects].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "title":
        comparison = (a.details?.title || "").localeCompare(b.details?.title || "");
        break;
      case "createdAt":
        comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        break;
      case "updatedAt":
        comparison = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
        break;
      default:
        comparison = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return sorted;
};

export const ProjectsExplorer = () => {
  const [selectedSort, setSelectedSort] = useQueryState("sortBy", {
    defaultValue: "updatedAt" as ExplorerSortByOptions,
    parse: (value) => (value as ExplorerSortByOptions) || "updatedAt",
  });
  const [selectedSortOrder, setSelectedSortOrder] = useQueryState("sortOrder", {
    defaultValue: "desc" as ExplorerSortOrder,
    parse: (value) => (value as ExplorerSortOrder) || "desc",
  });

  const { projects, isLoading, isError } = useProjectsExplorer();

  const sortedProjects = useMemo(
    () =>
      sortProjects(
        projects,
        selectedSort as ExplorerSortByOptions,
        selectedSortOrder as ExplorerSortOrder
      ),
    [projects, selectedSort, selectedSortOrder]
  );

  const handleSortChange = (sort: ExplorerSortByOptions, order: ExplorerSortOrder) => {
    setSelectedSort(sort);
    setSelectedSortOrder(order);
  };

  return (
    <section id="browse-projects" className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h2 className="text-2xl font-bold text-black dark:text-white">Projects on Karma</h2>
        <SortDropdown
          selectedSort={selectedSort as ExplorerSortByOptions}
          selectedSortOrder={selectedSortOrder as ExplorerSortOrder}
          onSortChange={handleSortChange}
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <ProjectsLoading />
      ) : isError ? (
        <div className="text-center py-12 text-gray-500">
          Failed to load projects. Please try again.
        </div>
      ) : sortedProjects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No projects available</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sortedProjects.map((project, index) => (
            <ProjectCard key={project.uid} project={project} index={index} />
          ))}
        </div>
      )}
    </section>
  );
};
