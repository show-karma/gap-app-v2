"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

export type NavigationTab = "updates" | "about" | "funding" | "impact" | "team";

interface ProjectNavigationTabsProps {
  fundingCount?: number;
  teamCount?: number;
  className?: string;
}

interface TabConfig {
  value: NavigationTab;
  label: string;
  count?: number;
  href: string;
}

/**
 * ProjectNavigationTabs provides URL-based tab navigation for the project profile pages.
 * Each tab links to a different route within the project.
 *
 * Tabs:
 * - Updates: /project/:projectId
 * - About: /project/:projectId/about
 * - Funding: /project/:projectId/funding
 * - Impact: /project/:projectId/impact
 * - Team: /project/:projectId/team
 */
export function ProjectNavigationTabs({
  fundingCount,
  teamCount,
  className,
}: ProjectNavigationTabsProps) {
  const { projectId } = useParams();
  const pathname = usePathname();

  const projectSlug = projectId as string;
  const basePath = `/project/${projectSlug}`;

  // Determine active tab based on pathname
  const getActiveTab = (): NavigationTab => {
    if (pathname === `${basePath}/team`) return "team";
    if (pathname === `${basePath}/about`) return "about";
    if (pathname === `${basePath}/funding` || pathname?.startsWith(`${basePath}/funding/`))
      return "funding";
    if (pathname === `${basePath}/impact`) return "impact";
    // Default to updates for the main page
    return "updates";
  };

  const activeTab = getActiveTab();

  const tabs: TabConfig[] = [
    { value: "updates", label: "Updates", href: PAGES.PROJECT.OVERVIEW(projectSlug) },
    { value: "about", label: "About", href: PAGES.PROJECT.ABOUT(projectSlug) },
    {
      value: "funding",
      label: "Funding",
      count: fundingCount,
      href: PAGES.PROJECT.GRANTS(projectSlug),
    },
    { value: "impact", label: "Impact", href: PAGES.PROJECT.IMPACT.ROOT(projectSlug) },
    { value: "team", label: "Team", count: teamCount, href: PAGES.PROJECT.TEAM(projectSlug) },
  ];

  return (
    <nav
      className={cn("w-full", className)}
      data-testid="project-navigation-tabs"
      aria-label="Project navigation"
    >
      <div
        className="flex flex-row justify-start items-center bg-transparent border-b border-border h-auto p-0 gap-0"
        role="tablist"
        data-testid="navigation-tabs-list"
      >
        {tabs.map((tab) => {
          const isActive = tab.value === activeTab;
          return (
            <Link
              key={tab.value}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "relative px-4 py-3 rounded-none bg-transparent shadow-none",
                "text-muted-foreground font-medium transition-colors",
                "hover:text-foreground",
                isActive && "text-foreground",
                "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
                "after:bg-transparent",
                isActive && "after:bg-foreground"
              )}
              data-testid={`nav-tab-${tab.value}`}
              data-state={isActive ? "active" : "inactive"}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full"
                    data-testid={`nav-tab-${tab.value}-count`}
                  >
                    {tab.count}
                  </Badge>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
