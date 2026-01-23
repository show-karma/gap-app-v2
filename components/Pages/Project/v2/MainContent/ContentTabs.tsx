"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

export type ContentTab = "updates" | "about" | "funding" | "impact" | "team";

interface ContentTabsProps {
  activeTab: ContentTab;
  onTabChange?: (tab: ContentTab) => void;
  fundingCount?: number;
  teamCount?: number;
  className?: string;
}

/**
 * ContentTabs provides tab navigation for the project profile page.
 * Uses Next.js Links for actual page navigation.
 */
export function ContentTabs({
  activeTab,
  onTabChange,
  fundingCount,
  teamCount,
  className,
}: ContentTabsProps) {
  const params = useParams();
  const projectId = params?.projectId as string;

  const tabs: { value: ContentTab; label: string; href: string; count?: number }[] = [
    { value: "updates", label: "Updates", href: PAGES.PROJECT.OVERVIEW(projectId) },
    { value: "about", label: "About", href: PAGES.PROJECT.ABOUT(projectId) },
    {
      value: "funding",
      label: "Funding",
      href: PAGES.PROJECT.GRANTS(projectId),
      count: fundingCount,
    },
    { value: "impact", label: "Impact", href: PAGES.PROJECT.IMPACT.ROOT(projectId) },
    { value: "team", label: "Team", href: PAGES.PROJECT.TEAM(projectId), count: teamCount },
  ];

  return (
    <div
      role="tablist"
      aria-label="Project sections"
      className={cn("w-full flex justify-start border-b border-border gap-0", className)}
      data-testid="content-tabs"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <Link
            key={tab.value}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${tab.value}-panel`}
            onClick={() => onTabChange?.(tab.value)}
            className={cn(
              "relative px-4 py-3 text-sm font-medium transition-colors",
              "text-muted-foreground hover:text-foreground",
              isActive && "text-foreground",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
              "after:bg-transparent",
              isActive && "after:bg-foreground"
            )}
            data-testid={`tab-${tab.value}`}
            data-state={isActive ? "active" : "inactive"}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full"
                  data-testid={`tab-${tab.value}-count`}
                >
                  {tab.count}
                </Badge>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
