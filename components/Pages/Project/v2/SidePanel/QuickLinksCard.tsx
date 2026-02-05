"use client";

import { GlobeIcon, NotebookTabsIcon, PresentationIcon, TvIcon } from "lucide-react";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useIntroModalStore } from "@/store/modals/intro";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";

interface QuickLink {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

interface QuickLinksCardProps {
  project: Project;
  className?: string;
}

/**
 * QuickLinksCard displays a list of quick action links for the project.
 * Matches Figma design with separate card, Lucide icons and neutral colors.
 * Includes: Request Intro, Website, Pitch Deck, Demo Video
 */
export function QuickLinksCard({ project, className }: QuickLinksCardProps) {
  const { setIsIntroModalOpen } = useIntroModalStore();

  const ensureProtocol = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    return url.includes("://") ? url : `https://${url}`;
  };

  const websiteUrl = project?.details?.links?.find((link) => link.type === "website")?.url;
  const pitchDeckUrl = project?.details?.links?.find((link) => link.type === "pitchDeck")?.url;
  const demoVideoUrl = project?.details?.links?.find((link) => link.type === "demoVideo")?.url;

  const links: QuickLink[] = [
    {
      icon: <NotebookTabsIcon className="h-4 w-4" />,
      label: "Request Intro",
      onClick: () => setIsIntroModalOpen(true),
    },
    ...(websiteUrl
      ? [
          {
            icon: <GlobeIcon className="h-4 w-4" />,
            label: "Website",
            href: ensureProtocol(websiteUrl),
          },
        ]
      : []),
    ...(pitchDeckUrl
      ? [
          {
            icon: <PresentationIcon className="h-4 w-4" />,
            label: "Pitch Deck",
            href: ensureProtocol(pitchDeckUrl),
          },
        ]
      : []),
    ...(demoVideoUrl
      ? [
          {
            icon: <TvIcon className="h-4 w-4" />,
            label: "Demo Video",
            href: ensureProtocol(demoVideoUrl),
          },
        ]
      : []),
  ];

  if (links.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-8 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm",
        className
      )}
      data-testid="quick-links-card"
    >
      {/* Header */}
      <span className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">
        Quick links
      </span>

      {/* Links */}
      <div className="flex flex-col gap-2">
        {links.map((link, index) => {
          const isLast = index === links.length - 1;
          const itemContent = (
            <>
              <div className="flex flex-row items-center gap-2 py-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors">
                {link.icon}
                <span className="text-sm font-medium">{link.label}</span>
              </div>
              {!isLast && <div className="h-px w-full bg-neutral-200 dark:bg-zinc-700" />}
            </>
          );

          if (link.onClick) {
            return (
              <div key={link.label}>
                <button
                  type="button"
                  onClick={link.onClick}
                  className="text-left"
                  data-testid={`quick-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {itemContent}
                </button>
              </div>
            );
          }

          return (
            <div key={link.label}>
              <ExternalLink
                href={link.href}
                className="text-left"
                data-testid={`quick-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {itemContent}
              </ExternalLink>
            </div>
          );
        })}
      </div>
    </div>
  );
}
