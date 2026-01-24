"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useStaff } from "@/hooks/useStaff";
import { useOwnerStore, useProjectStore } from "@/store";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

export type ContentTab =
  | "profile"
  | "updates"
  | "about"
  | "funding"
  | "impact"
  | "team"
  | "contact-info";

interface TabConfig {
  value: ContentTab;
  label: string;
  href?: string;
  count?: number;
  mobileOnly?: boolean;
}

interface ContentTabsProps {
  activeTab: ContentTab;
  onTabChange?: (tab: ContentTab) => void;
  fundingCount?: number;
  teamCount?: number;
  className?: string;
}

/**
 * ContentTabs provides tab navigation for the project profile page.
 *
 * Desktop: Updates, About, Funding, Impact, Team, Contact Info (if authorized)
 * Mobile: Profile (first), Updates, About, Funding, Impact, Team
 *
 * Profile tab (mobile only) shows project info, stats, actions, quick links.
 * Profile and Updates share the same URL - switching is handled via onTabChange.
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

  // Authorization checks for Contact Info tab
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const { isStaff, isLoading: isStaffLoading } = useStaff();
  const canViewContactInfo =
    isProjectOwner || isProjectAdmin || isContractOwner || (!isStaffLoading && isStaff);

  const baseTabs: TabConfig[] = [
    // Profile tab - mobile only, no href (uses onTabChange)
    { value: "profile", label: "Profile", mobileOnly: true },
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

  // Add Contact Info tab only for authorized users
  const tabs: TabConfig[] = canViewContactInfo
    ? [
        ...baseTabs,
        {
          value: "contact-info",
          label: "Contact Info",
          href: PAGES.PROJECT.CONTACT_INFO(projectId),
        },
      ]
    : baseTabs;

  const tabClassName = (isActive: boolean) =>
    cn(
      "relative px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
      "text-muted-foreground hover:text-foreground",
      isActive && "text-foreground",
      "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
      "after:bg-transparent",
      isActive && "after:bg-foreground"
    );

  return (
    <div
      role="tablist"
      aria-label="Project sections"
      className={cn(
        "w-full flex justify-start border-b border-border gap-0 overflow-x-auto",
        className
      )}
      data-testid="content-tabs"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        // For mobile-only tabs or tabs without href, use button
        const isMobileOnlyTab = tab.mobileOnly;

        if (isMobileOnlyTab) {
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.value}-panel`}
              onClick={() => onTabChange?.(tab.value)}
              className={cn(
                tabClassName(isActive),
                "lg:hidden" // Hide on desktop
              )}
              data-testid={`tab-${tab.value}`}
              data-state={isActive ? "active" : "inactive"}
            >
              <span className="flex items-center gap-2">{tab.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={tab.value}
            href={tab.href || "#"}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${tab.value}-panel`}
            onClick={() => onTabChange?.(tab.value)}
            className={tabClassName(isActive)}
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
