"use client";

import { CheckCircle2Icon, RocketIcon } from "lucide-react";
import { useState } from "react";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { useProjectSocials } from "@/hooks/useProjectSocials";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";

interface ProjectHeaderProps {
  project: Project;
  isVerified?: boolean;
  className?: string;
}

/**
 * ProjectHeader displays the project's profile picture, name, verification badge,
 * social links, description with "Read More" functionality, and project stage.
 *
 * Matches Figma design with:
 * - Card wrapper with border and rounded corners
 * - Green verification badge
 * - Social icons in top-right corner
 * - Desktop: 82px profile pic
 * - Mobile: 64px profile pic
 */
export function ProjectHeader({ project, isVerified = false, className }: ProjectHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const socials = useProjectSocials(project?.details?.links);

  const description = project?.details?.description || "";
  const shouldTruncate = description.length > 200;
  const displayDescription =
    shouldTruncate && !isExpanded ? `${description.slice(0, 200)}...` : description;

  const stageLabel = project?.details?.stageIn || "";

  return (
    <div className={cn("w-full", className)} data-testid="project-header">
      {/* Card wrapper matching Figma */}
      <div className="relative rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-6 lg:p-8">
        {/* Social links - positioned in top-right corner */}
        {socials.length > 0 && (
          <div
            className="absolute top-6 right-6 lg:top-8 lg:right-8 flex flex-row items-center gap-3"
            data-testid="social-links"
          >
            {socials.map((social) => (
              <a
                key={social.url}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                aria-label={`Visit ${social.name}`}
              >
                <social.icon className="h-5 w-5 fill-current" />
              </a>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Top row: Profile pic and name */}
          <div className="flex flex-row items-start gap-4">
            {/* Profile Picture - Desktop: 82px, Mobile: 64px */}
            <ProfilePicture
              imageURL={project?.details?.logoUrl}
              name={project?.uid || ""}
              size="82"
              className="hidden lg:block h-[82px] w-[82px] min-w-[82px] min-h-[82px] shrink-0 rounded-full border-2 border-white shadow-lg"
              alt={project?.details?.title || "Project"}
            />
            <ProfilePicture
              imageURL={project?.details?.logoUrl}
              name={project?.uid || ""}
              size="64"
              className="lg:hidden h-16 w-16 min-w-16 min-h-16 shrink-0 rounded-full border-2 border-white shadow-lg"
              alt={project?.details?.title || "Project"}
            />

            {/* Name with verification badge */}
            <div className="flex flex-col gap-1 pt-2">
              <div className="flex flex-row items-center gap-2">
                <h1
                  className="text-xl font-bold leading-tight line-clamp-2 lg:text-2xl text-neutral-900 dark:text-white tracking-tight"
                  data-testid="project-title"
                >
                  {project?.details?.title}
                </h1>
                {isVerified && (
                  <CheckCircle2Icon
                    className="h-6 w-6 text-teal-500 dark:text-teal-400 shrink-0 fill-teal-500 stroke-white dark:fill-teal-400 dark:stroke-zinc-800"
                    data-testid="verification-badge"
                    aria-label="Verified project"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Description with Read More */}
          {description && (
            <div className="flex flex-col gap-1 max-w-xl">
              <p
                className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed"
                data-testid="project-description"
              >
                {displayDescription}
                {shouldTruncate && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-sm font-semibold text-neutral-900 hover:text-neutral-700 dark:text-white dark:hover:text-neutral-200 underline underline-offset-2"
                      data-testid="read-more-button"
                    >
                      {isExpanded ? "Show less" : "Read More"}
                    </button>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Stage indicator */}
          {stageLabel && (
            <div className="flex flex-row items-center gap-2" data-testid="project-stage">
              <RocketIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <span className="text-sm text-neutral-500 dark:text-neutral-400">Stage</span>
              <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                {stageLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
