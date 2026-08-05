"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { Role } from "@/src/core/rbac/types";
import { useAutoTour } from "@/src/features/onboarding/hooks/use-tour";
import { useTourFromUrl } from "@/src/features/onboarding/hooks/use-tour-from-url";
import {
  dataTour,
  TOUR_ANCHORS,
  type TourAnchor,
} from "@/src/features/onboarding/lib/tour-anchors";
import { PROJECT_WORKSPACE_TOUR } from "@/src/features/onboarding/lib/tours";
import { useOwnerStore, useProjectStore } from "@/store";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

export type ContentTab =
  | "support"
  | "updates"
  | "about"
  | "funding"
  | "impact"
  | "team"
  | "contact-info";

/**
 * Tabs the project-workspace walkthrough points at. Declared here so the tab
 * that carries an anchor is visible at the place the tabs are defined.
 */
const TAB_TOUR_ANCHORS: Partial<Record<ContentTab, TourAnchor>> = {
  funding: TOUR_ANCHORS.projectGrants,
  updates: TOUR_ANCHORS.projectUpdates,
};

/** `data-tour` for a tab that a walkthrough points at, or nothing. */
function tourAttributes(tab: ContentTab) {
  const anchor = TAB_TOUR_ANCHORS[tab];
  return anchor ? dataTour(anchor) : {};
}

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
 * Desktop: Updates, About, Funding, Impact, Contact (if authorized)
 * Mobile: Support (first, mobile-only), Updates, About, Funding, Impact
 *
 * Support tab (mobile only) shows Donate, Endorse, Subscribe, and Quick Links.
 * Profile card is always visible above the tabs on mobile.
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

  // The tabs this tour points at are part of this component, so it is offered
  // from here — once a project exists there is something to walk through.
  useAutoTour(PROJECT_WORKSPACE_TOUR, Boolean(projectId));
  useTourFromUrl(PROJECT_WORKSPACE_TOUR, Boolean(projectId));

  // Authorization checks for Contact Info tab
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const { authenticated } = useAuth();
  const { data: permissions, isLoading: isPermissionsLoading } = usePermissionsQuery(
    {},
    { enabled: authenticated }
  );
  const isSuperAdmin = permissions?.roles?.roles?.includes(Role.SUPER_ADMIN) ?? false;
  const canViewContactInfo =
    isProjectOwner || isProjectAdmin || isContractOwner || (!isPermissionsLoading && isSuperAdmin);

  const baseTabs: TabConfig[] = [
    // Support tab - mobile only, no href (uses onTabChange)
    { value: "support", label: "Support", mobileOnly: true },
    { value: "updates", label: "Updates", href: PAGES.PROJECT.OVERVIEW(projectId) },
    { value: "about", label: "About", href: PAGES.PROJECT.ABOUT(projectId) },
    {
      value: "funding",
      label: "Funding",
      href: PAGES.PROJECT.GRANTS(projectId),
      count: fundingCount,
    },
    { value: "impact", label: "Impact", href: PAGES.PROJECT.IMPACT.ROOT(projectId) },
  ];

  // Add Contact Info tab only for authorized users
  const tabs: TabConfig[] = canViewContactInfo
    ? [
        ...baseTabs,
        {
          value: "contact-info",
          label: "Contact",
          href: PAGES.PROJECT.CONTACT_INFO(projectId),
        },
      ]
    : baseTabs;

  const tabClassName = (isActive: boolean) =>
    cn(
      "relative px-3 py-2 text-sm lg:px-6 lg:py-3 lg:text-base font-medium transition-colors whitespace-nowrap",
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
        // On desktop, when activeTab is "support" (which is hidden), Updates should appear active
        const isActiveOnDesktop = tab.value === "updates" && activeTab === "support";
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
            aria-selected={isActive || isActiveOnDesktop}
            aria-controls={`${tab.value}-panel`}
            onClick={() => onTabChange?.(tab.value)}
            className={cn(
              tabClassName(isActive),
              // On desktop, when Profile tab is active (but hidden), show Updates as active
              isActiveOnDesktop && "lg:text-foreground lg:after:bg-foreground"
            )}
            data-testid={`tab-${tab.value}`}
            data-state={isActive || isActiveOnDesktop ? "active" : "inactive"}
            {...tourAttributes(tab.value)}
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
