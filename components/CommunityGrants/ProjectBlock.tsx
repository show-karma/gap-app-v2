import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import pluralize from "pluralize";
import { memo } from "react";
import type { CommunityProject } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { MarkdownPreview } from "../Utilities/MarkdownPreview";
import { ProjectVisual } from "./ProjectVisual";

interface ProjectBlockProps {
  project: CommunityProject;
}

function ProjectBlockComponent({ project }: ProjectBlockProps) {
  const title = project.details.title || project.uid;
  const projectPath = PAGES.PROJECT.OVERVIEW(project.details.slug || project.uid);
  return (
    <article
      data-testid="project-block"
      className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
    >
      <Link
        href={projectPath}
        className="grid min-h-36 grid-cols-[112px_minmax(0,1fr)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset lg:grid-cols-[152px_minmax(0,1fr)]"
      >
        <ProjectVisual
          uid={project.uid}
          title={title}
          imageUrl={project.details.logoUrl}
          categories={project.categories}
          className="w-full self-start"
        />

        <div className="flex min-w-0 flex-col p-4 sm:p-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-base font-semibold leading-snug text-zinc-950 dark:text-zinc-100 sm:text-lg">
                {title}
              </h3>
            </div>
            <ArrowUpRightIcon
              aria-hidden
              className="mt-1 size-4 shrink-0 text-zinc-400 transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-300"
            />
          </div>

          <div className="line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <MarkdownPreview variant="excerpt" source={project.details.description} />
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-zinc-500 dark:text-zinc-400">
            {project.numMilestones > 0 ? (
              <span>
                {project.numCompletedMilestones} of {project.numMilestones}{" "}
                {pluralize("milestone", project.numMilestones)}
              </span>
            ) : null}
            {project.numUpdates > 0 ? (
              <span>
                {project.numUpdates} {pluralize("update", project.numUpdates)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

export const ProjectBlock = memo(ProjectBlockComponent);
