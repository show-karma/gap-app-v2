import { Sprout, Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utilities/formatDate";
import { rewriteHeadingsToLevel } from "@/utilities/markdown";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

// Demote all headings (h1-h5) to h6 for card descriptions
const demoteAllHeadings = rewriteHeadingsToLevel(6);

export interface SeedsProject {
  uid: string;
  createdAt: string;
  details: {
    title: string;
    description?: string;
    missionSummary?: string;
    slug: string;
    logoUrl?: string;
  };
  stats?: {
    grantsCount?: number;
    grantMilestonesCount?: number;
  };
}

interface SeedsProjectCardProps {
  project: SeedsProject;
}

export const SeedsProjectCard = ({ project }: SeedsProjectCardProps) => {
  const { details, createdAt, stats } = project;

  // Get stats from API response
  const grantsCount = stats?.grantsCount ?? 0;
  const grantMilestonesCount = stats?.grantMilestonesCount ?? 0;

  // Placeholder seeds data - will be replaced with real data when available
  const seedsData = useMemo(
    () => ({
      totalSeeds: Math.floor(Math.random() * 10000) + 500,
      supporters: Math.floor(Math.random() * 200) + 10,
    }),
    []
  );

  return (
    <Link
      href={PAGES.PROJECT.OVERVIEW(details.slug)}
      aria-label={`View ${details.title} project details`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-seeds-300 focus-visible:ring-offset-2 rounded-lg group"
    >
      <div className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-zinc-900 h-full">
        {/* Green accent bar for seeds projects */}
        <div className="h-2 bg-gradient-to-r from-seeds-300 to-seeds-400" aria-hidden="true" />

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
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                {details.title}
              </h3>
            </div>
            {/* Seeds badge */}
            <div className="flex-shrink-0">
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-seeds-300/20 dark:bg-seeds-300/10 text-seeds-400 dark:text-seeds-300 rounded-full">
                <Sprout className="w-3 h-3" />
                Seeds
              </span>
            </div>
          </div>

          {/* Date */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Created on {formatDate(createdAt)}
          </p>

          {/* Description with markdown */}
          <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 overflow-hidden mb-4 flex-1">
            <MarkdownPreview
              source={details.description || details.missionSummary || "No description available"}
              className="!text-sm !leading-relaxed [&>*]:!m-0 [&>*]:!p-0"
              rehypeRewrite={(node) => demoteAllHeadings(node)}
              components={{
                a: ({ children }) => <span>{children}</span>,
              }}
            />
          </div>

          {/* Seeds Stats */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-1 text-xs bg-seeds-300/10 border border-seeds-300/30 dark:border-seeds-300/20 rounded text-seeds-400 dark:text-seeds-300 flex items-center gap-1">
              <Sprout className="w-3 h-3" />
              {seedsData.totalSeeds.toLocaleString()} seeds
            </span>
            <span className="px-2 py-1 text-xs bg-seeds-300/10 border border-seeds-300/30 dark:border-seeds-300/20 rounded text-seeds-400 dark:text-seeds-300 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {seedsData.supporters} supporters
            </span>
          </div>

          {/* Regular Stats */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-zinc-800 rounded text-gray-600 dark:text-gray-400">
              {grantsCount} {grantsCount === 1 ? "grant" : "grants"}
            </span>
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-zinc-800 rounded text-gray-600 dark:text-gray-400">
              {grantMilestonesCount} {grantMilestonesCount === 1 ? "milestone" : "milestones"}
            </span>
          </div>

          {/* Support CTA - shows on hover */}
          <div
            className={cn(
              "mt-auto opacity-0 group-hover:opacity-100 transition-opacity",
              "pointer-events-none group-hover:pointer-events-auto"
            )}
          >
            <Button
              size="sm"
              className="w-full bg-seeds-300 hover:bg-seeds-400 text-seeds-600"
              onClick={(e) => {
                e.preventDefault();
                // Will navigate to project seeds page when implemented
                window.location.href = PAGES.PROJECT.OVERVIEW(details.slug);
              }}
            >
              <Sprout className="w-4 h-4 mr-2" />
              Support This Project
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
};
