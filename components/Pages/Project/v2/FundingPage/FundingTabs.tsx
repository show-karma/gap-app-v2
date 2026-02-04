"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

type TabValue = "updates" | "about" | "funding" | "impact" | "team";

interface FundingTabsProps {
  fundingCount?: number;
  teamCount?: number;
  className?: string;
}

/**
 * FundingTabs provides tab navigation for the project funding page.
 * Similar to ContentTabs but uses Link navigation and has "Funding" selected.
 */
export function FundingTabs({ fundingCount, teamCount, className }: FundingTabsProps) {
  const { projectId } = useParams();
  const projectSlug = projectId as string;

  const tabs: { value: TabValue; label: string; href: string; count?: number }[] = [
    {
      value: "updates",
      label: "Updates",
      href: PAGES.PROJECT.OVERVIEW(projectSlug),
    },
    {
      value: "about",
      label: "About",
      href: PAGES.PROJECT.ABOUT(projectSlug),
    },
    {
      value: "funding",
      label: "Funding",
      href: PAGES.PROJECT.GRANTS(projectSlug),
      count: fundingCount,
    },
    {
      value: "impact",
      label: "Impact",
      href: PAGES.PROJECT.IMPACT.ROOT(projectSlug),
    },
    {
      value: "team",
      label: "Team",
      href: PAGES.PROJECT.TEAM(projectSlug),
      count: teamCount,
    },
  ];

  return (
    <div className={cn("w-full", className)} data-testid="funding-tabs">
      <div
        className="flex w-full border-b border-border"
        role="tablist"
        aria-label="Project sections"
      >
        {tabs.map((tab) => {
          const isActive = tab.value === "funding";
          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={cn(
                "relative px-4 py-3 text-sm font-medium transition-colors",
                "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground"
                  : "text-muted-foreground"
              )}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              data-testid={`tab-${tab.value}`}
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
    </div>
  );
}
