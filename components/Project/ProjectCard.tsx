import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";
import { ProjectFromList } from "@/types/project";
import Link from "next/link";
import formatCurrency from "@/utilities/formatCurrency";
import pluralize from "pluralize";
import { MarkdownPreview } from "../Utilities/MarkdownPreview";
import { ExternalLink } from "../Utilities/ExternalLink";

// Array of colors to use for project cards
const cardColors = [
  "#5FE9D0",
  "#875BF7",
  "#F97066",
  "#FDB022",
  "#A6EF67",
  "#84ADFF",
  "#EF6820",
  "#EE46BC",
  "#EEAAFD",
  "#67E3F9",
];

interface ProjectCardProps {
  project: ProjectFromList;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  // Pick a color based on the project uid to ensure consistency
  const colorIndex = project.uid.charCodeAt(0) % cardColors.length;
  const cardColor = cardColors[colorIndex];

  return (
    <ExternalLink
      href={PAGES.PROJECT.OVERVIEW(project?.slug || project?.uid)}
      className="flex h-full w-full relative flex-col items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-4 transition-all duration-300 ease-in-out hover:opacity-90 hover:shadow-md"
    >
      <div className="w-full flex flex-col gap-3">
        {/* Color bar at top */}
        <div
          className="h-[4px] w-full rounded-full"
          style={{ background: cardColor }}
        />

        {/* Project title and created date */}
        <div className="flex w-full flex-col">
          <h4 className="line-clamp-1 break-all text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {project?.title}
          </h4>

          <p className="mb-2 text-sm font-medium text-gray-500 dark:text-zinc-300">
            Created on {formatDate(project.createdAt)}
          </p>

          {/* Project description */}
          <div className="flex-1 h-[72px]">
            <MarkdownPreview source={project?.description?.slice(0, 160)} />
          </div>
        </div>
      </div>

      {/* Project stats */}
      <div className="flex w-full flex-col justify-start gap-2 mt-2">
        <div className="flex flex-wrap gap-2">
          {/* Grant stats */}
          <div className="flex h-max items-center justify-center rounded-full bg-slate-50 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 px-3 py-1">
            <p className="text-center text-sm font-medium">
              {formatCurrency(project.noOfGrants)}{" "}
              {pluralize("Grant", project.noOfGrants)}
            </p>
          </div>

          {/* Milestone stats if available */}
          {project.noOfGrantMilestones > 0 && (
            <div className="flex h-max items-center justify-center rounded-full bg-slate-50 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 px-3 py-1">
              <p className="text-center text-sm font-medium">
                {project.noOfGrantMilestones}{" "}
                {pluralize("Milestone", project.noOfGrantMilestones)}
              </p>
            </div>
          )}

          {/* Roadmap stats */}
          <div className="flex h-max items-center justify-center rounded-full bg-slate-50 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 px-3 py-1">
            <p className="text-center text-sm font-medium">
              {formatCurrency(project.noOfProjectMilestones)} Roadmap{" "}
              {pluralize("item", project.noOfProjectMilestones)}
            </p>
          </div>
        </div>
      </div>
    </ExternalLink>
  );
}
