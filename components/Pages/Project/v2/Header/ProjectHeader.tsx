"use client";

import { GlobeIcon, RocketIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { ProjectOptionsMenu } from "@/components/Pages/Project/ProjectOptionsMenu";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { useProjectSocials } from "@/hooks/useProjectSocials";
import type { Project } from "@/types/v2/project";
import { isCustomLink } from "@/utilities/customLink";
import { ensureProtocol } from "@/utilities/ensureProtocol";
import { cn } from "@/utilities/tailwind";
import { VerificationBadge } from "../icons/VerificationBadge";
import { ProjectActivityChart } from "../MainContent/ProjectActivityChart";

interface CustomLink {
  url: string;
  name?: string;
}

interface ProjectHeaderProps {
  project: Project;
  isVerified?: boolean;
  className?: string;
}

/**
 * ProjectHeader displays the project's profile picture, name, verification badge,
 * social links, description with "Read More" functionality, project stage,
 * and a Project Activity chart.
 *
 * Layout:
 * - Desktop: Two columns - Info (left) | Divider | Project Activity (right)
 * - Mobile: Single column - Info stacked above Project Activity
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

  // Get custom links (links with name property that aren't standard socials)
  const customLinks = useMemo<CustomLink[]>(() => {
    return (project?.details?.links?.filter(isCustomLink) as CustomLink[]) || [];
  }, [project?.details?.links]);

  const description = project?.details?.description || "";
  const shouldTruncate = description.length > 200;
  const displayDescription =
    shouldTruncate && !isExpanded ? `${description.slice(0, 200)}...` : description;

  const stageLabel = project?.details?.stageIn || "";

  return (
    <div className={cn("w-full", className)} data-testid="project-header">
      {/* Card wrapper matching Figma */}
      <div className="relative rounded-xl border border-border border-t-0 border-l-0 border-r-0 bg-card p-6 lg:p-8">
        {/* Desktop: Two columns with divider (50/50) | Mobile: Single column */}
        <div className="flex flex-col lg:flex-row lg:gap-8">
          {/* Left side: Project Info - 50% width on desktop */}
          <div className="flex flex-col gap-4 lg:flex-1 lg:basis-1/2 lg:min-w-0 w-full">
            {/* Top row: Profile pic, name, and social links */}
            <div className="flex flex-row items-center gap-4 w-full flex-wrap max-sm:flex-col">
              <div className="flex flex-row items-center justify-between flex-1 min-w-0 flex-wrap gap-4">
                {/* Profile Picture - Single image with responsive sizing (Desktop: 82px, Mobile: 64px) */}
                <ProfilePicture
                  imageURL={project?.details?.logoUrl}
                  name={project?.uid || ""}
                  size="82"
                  className="h-16 w-16 min-w-16 min-h-16 lg:h-[82px] lg:w-[82px] lg:min-w-[82px] lg:min-h-[82px] shrink-0 rounded-full border-2 border-white shadow-lg"
                  alt={project?.details?.title || "Project"}
                  priority
                  sizes="(max-width: 1024px) 64px, 82px"
                />

                {/* Name with verification badge and social links - spread apart */}
                <div className="flex flex-row items-center justify-between flex-1 min-w-0 flex-wrap">
                  <div className="flex flex-row items-center gap-2 flex-wrap">
                    <h1
                      className="text-xl font-bold leading-tight lg:text-2xl text-neutral-900 dark:text-white tracking-tight min-w-max"
                      data-testid="project-title"
                    >
                      {project?.details?.title}
                    </h1>
                    {isVerified && (
                      <VerificationBadge
                        className="h-6 w-6"
                        data-testid="verification-badge"
                        aria-label="Verified project"
                      />
                    )}
                  </div>
                  {/* Social links - Desktop only, positioned at far right */}
                  <div
                    className="hidden lg:flex flex-row items-center gap-3"
                    data-testid="header-actions"
                  >
                    {socials.map((social) => (
                      <a
                        key={social.url}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                        aria-label={`Visit ${social.name}`}
                        data-testid="social-link"
                      >
                        <social.icon className="h-5 w-5" />
                      </a>
                    ))}
                    {customLinks.length > 0 && (
                      <div className="relative group">
                        <GlobeIcon
                          className="h-5 w-5 text-blue-800 hover:text-blue-900 dark:text-blue-200 dark:hover:text-blue-100 cursor-pointer transition-colors"
                          data-testid="custom-links-trigger"
                        />
                        <div className="absolute right-0 top-6 mt-1 w-48 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <div className="py-2">
                            {customLinks.map((link, index) => (
                              <a
                                key={link.url || index}
                                href={ensureProtocol(link.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors duration-150"
                                data-testid="custom-link"
                              >
                                {link.name || link.url}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <ProjectOptionsMenu />
                  </div>
                </div>
              </div>
              {/* Social links and options menu - positioned after name on desktop, absolute on mobile */}
              <div
                className="lg:hidden flex flex-row items-center gap-3 z-10 flex-wrap"
                data-testid="header-actions-mobile"
              >
                {socials.map((social) => (
                  <a
                    key={social.url}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                    aria-label={`Visit ${social.name}`}
                    data-testid="social-link"
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
                {customLinks.length > 0 && (
                  <div className="relative group">
                    <GlobeIcon
                      className="h-5 w-5 text-blue-800 hover:text-blue-900 dark:text-blue-200 dark:hover:text-blue-100 cursor-pointer transition-colors"
                      data-testid="custom-links-trigger-mobile"
                    />
                    <div className="absolute right-0 top-6 mt-1 w-48 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      <div className="py-2">
                        {customLinks.map((link, index) => (
                          <a
                            key={link.url || index}
                            href={ensureProtocol(link.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors duration-150"
                            data-testid="custom-link"
                          >
                            {link.name || link.url}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <ProjectOptionsMenu />
              </div>
            </div>

            {/* Description with Read More */}
            {description && (
              <div className="flex flex-col gap-1 flex-1 w-full">
                <div data-testid="project-description">
                  <MarkdownPreview
                    source={displayDescription}
                    className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed"
                  />
                  {shouldTruncate && (
                    <button
                      type="button"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="mt-2 text-sm font-semibold text-neutral-900 hover:text-neutral-700 dark:text-white dark:hover:text-neutral-200 underline underline-offset-2"
                      data-testid="read-more-button"
                      aria-expanded={isExpanded}
                      aria-controls="project-description"
                    >
                      {isExpanded ? "Show less" : "Read More"}
                    </button>
                  )}
                </div>
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

          {/* Vertical Divider - Desktop only, extends to touch card borders */}
          <div className="hidden lg:block w-px bg-border self-stretch -my-8" />

          {/* Right side: Project Activity Chart - 50% width on desktop */}
          <div className="mt-6 lg:mt-0 lg:flex-1 lg:basis-1/2">
            <ProjectActivityChart embedded />
          </div>
        </div>
      </div>
    </div>
  );
}
