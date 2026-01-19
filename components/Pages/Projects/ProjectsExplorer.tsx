"use client";

import { useProjectsExplorer } from "@/hooks/useProjectsExplorer";
import { ProjectsLoading } from "./Loading";
import { ProjectCard } from "./ProjectCard";

export const ProjectsExplorer = () => {
  const { projects, isLoading, isError } = useProjectsExplorer();

  return (
    <section id="browse-projects" className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h2 className="text-2xl font-bold text-black dark:text-white">Projects on Karma</h2>
      </div>

      {/* Grid */}
      {isLoading ? (
        <ProjectsLoading />
      ) : isError ? (
        <div className="text-center py-12 text-gray-500">
          Failed to load projects. Please try again.
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No projects available</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {projects.map((project, index) => (
            <ProjectCard key={project.uid} project={project} index={index} />
          ))}
        </div>
      )}
    </section>
  );
};
