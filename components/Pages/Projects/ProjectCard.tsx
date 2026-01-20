import Link from "next/link";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import type { Project } from "@/types/v2/project";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";

interface ProjectCardProps {
  project: Project;
  index: number;
}

const CARD_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-green-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-indigo-500",
];

export const ProjectCard = ({ project, index }: ProjectCardProps) => {
  const colorClass = CARD_COLORS[index % CARD_COLORS.length];
  const { details, createdAt, stats } = project;

  // Get stats from API response, fallback to 0 if not available
  const grantsCount = stats?.grantsCount ?? 0;
  const grantMilestonesCount = stats?.grantMilestonesCount ?? 0;
  const roadmapItemsCount = stats?.roadmapItemsCount ?? 0;

  return (
    <Link href={PAGES.PROJECT.OVERVIEW(details.slug)}>
      <div className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-zinc-900 h-full">
        {/* Colored top bar */}
        <div className={`h-2 ${colorClass}`} />

        <div className="p-4 flex flex-col h-[calc(100%-8px)]">
          {/* Logo + Title row */}
          <div className="flex items-center gap-3 mb-2">
            <ProfilePicture
              imageURL={details.logoUrl}
              name={details.title || "Project"}
              size="40"
              className="w-10 h-10 flex-shrink-0"
              alt={details.title}
            />
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 flex-1">
              {details.title}
            </h3>
          </div>

          {/* Date */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Created on {formatDate(createdAt)}
          </p>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 flex-1">
            {details.description || details.missionSummary || "No description available"}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-2 mt-auto">
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-600 dark:text-gray-400">
              {grantsCount} {grantsCount === 1 ? "grant" : "grants"}
            </span>
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-600 dark:text-gray-400">
              {grantMilestonesCount} {grantMilestonesCount === 1 ? "milestone" : "milestones"}
            </span>
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-600 dark:text-gray-400">
              {roadmapItemsCount} {roadmapItemsCount === 1 ? "roadmap item" : "roadmap items"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
