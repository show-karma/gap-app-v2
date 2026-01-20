"use client";

import {
  DocumentTextIcon,
  GlobeAltIcon,
  HandRaisedIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
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
      icon: <HandRaisedIcon className="h-5 w-5" />,
      label: "Request Intro",
      onClick: () => setIsIntroModalOpen(true),
    },
    ...(websiteUrl
      ? [
          {
            icon: <GlobeAltIcon className="h-5 w-5" />,
            label: "Website",
            href: ensureProtocol(websiteUrl),
          },
        ]
      : []),
    ...(pitchDeckUrl
      ? [
          {
            icon: <DocumentTextIcon className="h-5 w-5" />,
            label: "Pitch Deck",
            href: ensureProtocol(pitchDeckUrl),
          },
        ]
      : []),
    ...(demoVideoUrl
      ? [
          {
            icon: <PlayCircleIcon className="h-5 w-5" />,
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
        "flex flex-col rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800",
        className
      )}
      data-testid="quick-links-card"
    >
      {links.map((link, index) => {
        const isLast = index === links.length - 1;
        const itemContent = (
          <div
            className={cn(
              "flex flex-row items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors",
              !isLast && "border-b border-gray-200 dark:border-zinc-700"
            )}
          >
            {link.icon}
            <span className="text-sm font-medium">{link.label}</span>
          </div>
        );

        if (link.onClick) {
          return (
            <button
              key={link.label}
              type="button"
              onClick={link.onClick}
              className="text-left"
              data-testid={`quick-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {itemContent}
            </button>
          );
        }

        return (
          <ExternalLink
            key={link.label}
            href={link.href}
            className="text-left"
            data-testid={`quick-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {itemContent}
          </ExternalLink>
        );
      })}
    </div>
  );
}
