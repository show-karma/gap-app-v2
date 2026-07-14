import type { CommunityProject } from "@/types/v2/community";
import { ProjectBlock } from "./ProjectBlock";

interface ProjectsGridProps {
  projects: CommunityProject[];
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No projects found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {projects.map((project) => (
        <ProjectBlock key={project.uid} project={project} />
      ))}
    </div>
  );
}
