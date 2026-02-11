"use client";

import dynamic from "next/dynamic";
import type { ProjectWithGrantsResponse } from "@/types/v2/project";
import { DashboardProjectCard } from "./DashboardProjectCard";
import { ProjectCardSkeleton } from "./ProjectCardSkeleton";

const ProjectDialog = dynamic(
  () => import("@/components/Dialogs/ProjectDialog/index").then((mod) => mod.ProjectDialog),
  { ssr: false }
);

interface ProjectsSectionProps {
  projects: ProjectWithGrantsResponse[];
  isLoading: boolean;
}

const projectSkeletonKeys = [
  "project-card-skeleton-1",
  "project-card-skeleton-2",
  "project-card-skeleton-3",
];

export function ProjectsSection({ projects, isLoading }: ProjectsSectionProps) {
  return (
    <section id="projects" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">My Projects</h2>
        <ProjectDialog
          buttonElement={{
            text: "Create Project",
            styleClass: "h-9 px-4",
          }}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projectSkeletonKeys.map((key) => (
            <ProjectCardSkeleton key={key} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          No projects yet. Create your first project to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <DashboardProjectCard key={project.uid} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}
