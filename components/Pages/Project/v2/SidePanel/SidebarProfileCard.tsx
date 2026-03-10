"use client";

import { ArrowUpRight, CopyCheck, GlobeIcon, Share } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { Button } from "@/components/ui/button";
import { useProjectSocials } from "@/hooks/useProjectSocials";
import type { Project } from "@/types/v2/project";
import { isCustomLink } from "@/utilities/customLink";
import { ensureProtocol } from "@/utilities/ensureProtocol";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { VerificationBadge } from "../icons/VerificationBadge";

interface CustomLink {
  url: string;
  name?: string;
}

interface SidebarProfileCardProps {
  project: Project;
  isVerified?: boolean;
  className?: string;
}

/**
 * SidebarProfileCard displays the project's identity in the sidebar:
 * avatar, name, verification badge, description, social links, and share action.
 *
 * Replaces the old ProjectHeader on desktop — profile info now lives in the sidebar.
 */
export function SidebarProfileCard({ project, isVerified, className }: SidebarProfileCardProps) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = params?.projectId as string;
  const socials = useProjectSocials(project?.details?.links);

  const customLinks = useMemo<CustomLink[]>(() => {
    return (project?.details?.links?.filter(isCustomLink) as CustomLink[]) || [];
  }, [project?.details?.links]);

  const description = project?.details?.description || "";
  const shouldTruncate = description.length > 200;
  const displayDescription = shouldTruncate ? `${description.slice(0, 200)}...` : description;

  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, scale: 1 });
  const [copied, setCopied] = useState(false);
  const [isCustomLinksOpen, setIsCustomLinksOpen] = useState(false);
  const customLinksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCustomLinksOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCustomLinksOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (customLinksRef.current && !customLinksRef.current.contains(e.target as Node)) {
        setIsCustomLinksOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCustomLinksOpen]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - top) / height - 0.5; // -0.5 to 0.5
    setTilt({ rotateX: y * 5, rotateY: -x * 10, scale: 1.02 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0, scale: 1 });
  }, []);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard write failed — do not show "Copied"
    }
  };

  const handleReadMoreClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const aboutPath = PAGES.PROJECT.ABOUT(projectId);
    if (pathname === aboutPath) {
      document
        .getElementById("description")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      router.push(`${aboutPath}?scrollTo=description`);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: mouse events are decorative only (3D tilt effect)
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(75rem) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale}) translateZ(0)`,
        transition:
          tilt.scale === 1
            ? "transform 500ms linear(0, 0.931 13.8%, 1.196 21.4%, 1.343 29.8%, 1.378 36%, 1.365 43.2%, 1.059 78%, 1)"
            : "transform 500ms linear(0, 0.708 15.2%, 0.927 23.6%, 1.067 33%, 1.12 41%, 1.13 50.2%, 1.019 83.2%, 1)",
      }}
      className={cn(
        "flex flex-col gap-4 p-6 rounded-lg border bg-background dark:bg-secondary will-change-transform transition-shadow duration-300",
        tilt.scale > 1 ? "shadow-lg" : "shadow-sm",
        className
      )}
      data-testid="sidebar-profile-card"
    >
      {/* Top row: avatar + share button */}
      <div className="flex flex-row items-start justify-between gap-4">
        <ProfilePicture
          imageURL={project?.details?.logoUrl}
          name={project?.uid || ""}
          size="64"
          className="h-16 w-16 min-w-16 min-h-16 shrink-0 rounded-full shadow-sm"
          alt={project?.details?.title || "Project"}
          priority
          sizes="64px"
        />
        <Button variant="outline" size="sm" onClick={handleShare} aria-label="Share project">
          {copied ? (
            <>
              <CopyCheck className="h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Share className="h-4 w-4" />
              Share
            </>
          )}
        </Button>
      </div>

      {/* Project name + verification badge */}
      <h2
        className="text-xl font-semibold text-foreground leading-tight"
        data-testid="sidebar-project-title"
      >
        {project?.details?.title}
        {isVerified && (
          <VerificationBadge
            className="h-4 w-4 inline-block align-middle ml-2 mt-0.5"
            aria-label="Verified project"
          />
        )}
      </h2>

      {/* Description with Read More */}
      {description && (
        <div data-testid="sidebar-project-description">
          <MarkdownPreview
            source={displayDescription}
            className="text-sm text-muted-foreground leading-relaxed"
          />
          {shouldTruncate && (
            <a
              href={`${PAGES.PROJECT.ABOUT(projectId)}?scrollTo=description`}
              onClick={handleReadMoreClick}
              className="mt-1 inline-flex items-center gap-0.5 text-sm font-semibold text-foreground underline underline-offset-2 cursor-pointer"
              data-testid="sidebar-read-more"
            >
              Read More
              <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Bottom row: social icons */}
      <div className="flex flex-row items-center gap-3 flex-wrap mt-1">
        {socials.map((social) => (
          <a
            key={social.url}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Visit ${social.name}`}
            data-testid="sidebar-social-link"
          >
            <social.icon className="h-4 w-4" />
          </a>
        ))}
        {customLinks.length > 0 && (
          <div className="relative" ref={customLinksRef}>
            <button
              type="button"
              onClick={() => setIsCustomLinksOpen((prev) => !prev)}
              aria-label="Custom links"
              aria-haspopup="menu"
              aria-expanded={isCustomLinksOpen}
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <GlobeIcon className="h-4 w-4" />
            </button>
            {isCustomLinksOpen && (
              <div
                role="menu"
                className="absolute left-0 top-6 mt-1 w-48 bg-popover border rounded-lg shadow-lg z-10"
              >
                <div className="py-2">
                  {customLinks.map((link, index) => (
                    <a
                      key={link.url || index}
                      href={ensureProtocol(link.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="menuitem"
                      className="block px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                      data-testid="sidebar-custom-link"
                    >
                      {link.name || link.url}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
