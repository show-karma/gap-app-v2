import type { CommunityProject } from "@/types/v2/community";
import { ProjectBlock } from "./ProjectBlock";
import { ProjectSpotlight } from "./ProjectSpotlight";

interface ProjectsGridProps {
  projects: CommunityProject[];
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  const featuredProject = projects[0];

  if (!featuredProject) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No projects found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <ProjectSpotlight project={featuredProject} />

      {projects.length > 1 ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {projects.map((project, index) =>
            index > 0 ? <ProjectBlock key={project.uid} project={project} /> : null
          )}
        </div>
      ) : null}
    </div>
  );
}
