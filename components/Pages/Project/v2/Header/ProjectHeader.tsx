"use client";

import { CheckBadgeIcon } from "@heroicons/react/24/solid";
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
 * Desktop: 82px profile pic with larger layout
 * Mobile: 64px profile pic with social links on same row
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
      <div className="flex flex-col gap-4">
        {/* Top row: Profile pic, name, socials */}
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

          {/* Name and details */}
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-row items-center justify-between gap-4">
              <div className="flex flex-row items-center gap-2">
                <h1
                  className="text-xl font-bold leading-tight line-clamp-2 lg:text-2xl text-gray-900 dark:text-white"
                  data-testid="project-title"
                >
                  {project?.details?.title}
                </h1>
                {isVerified && (
                  <CheckBadgeIcon
                    className="h-5 w-5 text-blue-500 shrink-0"
                    data-testid="verification-badge"
                    aria-label="Verified project"
                  />
                )}
              </div>

              {/* Social links - visible on mobile in header row */}
              {socials.length > 0 && (
                <div className="flex flex-row items-center gap-3 lg:hidden">
                  {socials.map((social) => (
                    <a
                      key={social.url}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                      aria-label={`Visit ${social.name}`}
                    >
                      <social.icon className="h-5 w-5 fill-current" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Social links - desktop version below title */}
            {socials.length > 0 && (
              <div className="hidden lg:flex flex-row items-center gap-4">
                {socials.map((social) => (
                  <a
                    key={social.url}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    aria-label={`Visit ${social.name}`}
                  >
                    <social.icon className="h-5 w-5 fill-current" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Description with Read More */}
        {description && (
          <div className="flex flex-col gap-1">
            <p
              className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
              data-testid="project-description"
            >
              {displayDescription}
            </p>
            {shouldTruncate && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 w-fit"
                data-testid="read-more-button"
              >
                {isExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        {/* Stage indicator */}
        {stageLabel && (
          <div className="flex flex-row items-center gap-2" data-testid="project-stage">
            <span className="text-lg" role="img" aria-label="rocket">
              🚀
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Stage: {stageLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
