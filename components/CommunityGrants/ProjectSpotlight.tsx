import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import pluralize from "pluralize";
import { memo } from "react";
import type { CommunityProject } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { MarkdownPreview } from "../Utilities/MarkdownPreview";
import { ProjectVisual } from "./ProjectVisual";

interface ProjectSpotlightProps {
  project: CommunityProject;
}

function ProjectSpotlightComponent({ project }: ProjectSpotlightProps) {
  const title = project.details.title || project.uid;
  const projectPath = PAGES.PROJECT.OVERVIEW(project.details.slug || project.uid);

  return (
    <section
      aria-labelledby="project-spotlight-title"
      className="relative grid overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-xl shadow-slate-950/10 lg:grid-cols-[1.15fr_0.85fr]"
    >
      <div className="relative z-10 flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-300">
          Project spotlight
        </p>
        <h2
          id="project-spotlight-title"
          className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
        >
          {title}
        </h2>
        <div className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
          <MarkdownPreview
            variant="excerpt"
            source={project.details.description}
            className="!text-slate-300 [&_*]:!text-slate-300"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
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

        <Link
          href={projectPath}
          aria-label={`View ${title}`}
          className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          View project
          <ArrowRightIcon aria-hidden className="size-4" />
        </Link>
      </div>

      <ProjectVisual
        uid={project.uid}
        title={title}
        imageUrl={project.details.logoUrl}
        categories={project.categories}
        priority
        variant="banner"
        className="min-h-72 border-t border-white/10 lg:min-h-full lg:border-t-0 lg:border-l"
      />
    </section>
  );
}

export const ProjectSpotlight = memo(ProjectSpotlightComponent);
