"use client";

import { ProjectOptionsMenu } from "@/components/Pages/Project/ProjectOptionsMenu";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { useProjectSocials } from "@/hooks/useProjectSocials";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";
import { VerificationBadge } from "../icons/VerificationBadge";

interface MobileHeaderMinifiedProps {
  project: Project;
  isVerified?: boolean;
  className?: string;
}

/**
 * MobileHeaderMinified shows a compact header on mobile for non-Profile tabs.
 *
 * Contains:
 * - Project avatar (small)
 * - Project title with verification badge
 * - Social links
 * - Options dropdown menu
 *
 * Displayed only on mobile (lg:hidden) when not on Profile tab.
 */
export function MobileHeaderMinified({
  project,
  isVerified = false,
  className,
}: MobileHeaderMinifiedProps) {
  const socials = useProjectSocials(project?.details?.links);

  return (
    <div
      className={cn("flex flex-col gap-3 p-4 rounded-xl border border-border bg-card", className)}
      data-testid="mobile-header-minified"
    >
      {/* Row 1: Logo + Title */}
      <div className="flex items-center gap-3">
        <ProfilePicture
          imageURL={project?.details?.logoUrl}
          name={project?.uid || ""}
          size="40"
          className="h-10 w-10 min-w-10 min-h-10 shrink-0 rounded-full border border-white shadow-sm"
          alt={project?.details?.title || "Project"}
        />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1
            className="text-base font-semibold text-neutral-900 dark:text-white truncate"
            data-testid="project-title-minified"
          >
            {project?.details?.title}
          </h1>
          {isVerified && (
            <VerificationBadge
              className="h-5 w-5 shrink-0"
              data-testid="verification-badge-minified"
              aria-label="Verified project"
            />
          )}
        </div>
      </div>

      {/* Row 2: Socials + Dropdown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {socials.map((social) => (
            <a
              key={social.url}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white transition-colors"
              aria-label={`Visit ${social.name}`}
              data-testid="social-link-minified"
            >
              <social.icon className="h-5 w-5" />
            </a>
          ))}
        </div>
        <ProjectOptionsMenu />
      </div>
    </div>
  );
}
