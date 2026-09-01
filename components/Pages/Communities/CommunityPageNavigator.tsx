"use client";
import {
  ChartLine,
  DollarSign,
  FileSearch,
  FileText,
  LandPlot,
  SquareUser,
  Wallet,
} from "lucide-react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { usePublishedReports } from "@/hooks/portfolio-reports/usePortfolioReports";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { Link } from "@/src/components/navigation/Link";
import {
  EXPLORER_NAV_OVERRIDES,
  FINANCIALS_ENABLED_COMMUNITIES,
} from "@/utilities/community-flags";
import { COMMUNITY_NAV_LABELS, type CommunityNavItemId } from "@/utilities/community-nav";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { useWhitelabel } from "@/utilities/whitelabel-context";

const activeLinkStyle =
  "text-gray-900 dark:text-white border-b-4 border-b-gray-900 dark:border-b-white";
const inactiveLinkStyle =
  "text-gray-500 dark:text-zinc-400 border-b-4 border-b-transparent hover:text-gray-700 dark:hover:text-zinc-300";
const baseLinkStyle =
  "flex flex-row items-center gap-3 p-3 rounded-none text-base font-normal leading-6 w-max shrink-0 transition-colors duration-200";

const NewTag = () => {
  return (
    <div className="rounded-2xl py-0.5 px-2 bg-brand-blue dark:bg-brand-blue/80 text-white dark:text-zinc-100 text-[11px] font-bold leading-none">
      New!
    </div>
  );
};

type NavigationItem = {
  /** Typed against the shared union so a typo cannot silently no-op an override. */
  readonly id: CommunityNavItemId;
  readonly path: (communityId: string) => string;
  readonly Icon: React.ElementType;
  /**
   * Matched against the community sub-segment (see {@link resolveSubSegment}),
   * never against the raw pathname — a community slug containing "reports" or
   * "impact" used to corrupt highlighting under substring matching.
   */
  readonly isActive: (segment: string) => boolean;
  readonly showNewTag?: boolean;
};

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    id: "funding-opportunities",
    path: (communityId: string) => PAGES.COMMUNITY.FUNDING_OPPORTUNITIES(communityId),
    Icon: DollarSign,
    isActive: (segment: string) => segment === "funding-opportunities",
  },
  {
    id: "browse-applications",
    path: (communityId: string) => PAGES.COMMUNITY.BROWSE_APPLICATIONS(communityId),
    Icon: FileSearch,
    isActive: (segment: string) => segment === "browse-applications",
  },
  {
    id: "community-projects",
    path: (communityId: string) => PAGES.COMMUNITY.PROJECTS(communityId),
    Icon: SquareUser,
    // The community root renders the funded-projects list, so "" counts too.
    isActive: (segment: string) => segment === "" || segment === "projects",
  },
  {
    id: "milestone-updates",
    path: (communityId: string) => PAGES.COMMUNITY.UPDATES(communityId),
    Icon: LandPlot,
    isActive: (segment: string) => segment === "updates",
  },
  {
    id: "impact",
    path: (communityId: string) => PAGES.COMMUNITY.IMPACT(communityId),
    Icon: ChartLine,
    isActive: (segment: string) => segment === "impact",
  },
  {
    id: "reports",
    path: (communityId: string) => PAGES.COMMUNITY.REPORTS(communityId),
    Icon: FileText,
    isActive: (segment: string) => segment === "reports",
  },
  {
    id: "financials",
    path: (communityId: string) => PAGES.COMMUNITY.FINANCIALS(communityId),
    Icon: Wallet,
    isActive: (segment: string) => segment === "financials",
    showNewTag: true,
  },
] as const;

const getPathWithProgramId = (program: string | null, basePath: string) => {
  return program ? `${basePath}?programId=${program}` : basePath;
};

/**
 * The segment that identifies which tab a path belongs to: for
 * `/community/<communityId>/<segment>/...` it is the segment after the community
 * id; on whitelabel hosts, where paths are bare (`/updates`), it is the first
 * segment. Returns "" for the community root.
 */
const resolveSubSegment = (pathname: string): string => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "community") return segments[2] ?? "";
  return segments[0] ?? "";
};

export const CommunityPageNavigator = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const communityId = params.communityId as string;
  const rawPathname = usePathname();
  const { isWhitelabel } = useWhitelabel();
  const programId = searchParams.get("programId");
  // In whitelabel mode, the middleware rewrites the root to /community/<slug>/funding-opportunities
  // but usePathname() still returns "/". Normalize so tab highlighting works correctly.
  const isWhitelabelRoot = isWhitelabel && (rawPathname === "/" || rawPathname === "");
  const pathname = isWhitelabelRoot ? "/funding-opportunities" : rawPathname;
  const segment = resolveSubSegment(pathname);

  // Check if we're on an admin page early to avoid unnecessary data fetching
  const isAdminPage = pathname.includes("/manage");

  // Whitelabel hosts only: the overrides hide tabs whose destinations that
  // tenant's own navbar carries, and only that host has such a navbar. On
  // karmahq.org this bar is the sole way into those routes, so it stays whole.
  // Keyed by the route param — see EXPLORER_NAV_OVERRIDES for the UID caveat.
  const override = isWhitelabel ? EXPLORER_NAV_OVERRIDES[communityId] : undefined;
  const isReportsTabHidden = override?.hiddenTabs?.includes("reports") ?? false;

  const { data: community } = useCommunityDetails(communityId);
  // Skip fetching programs on admin pages - the component returns null anyway
  const { data: programs } = useCommunityPrograms(communityId, {
    enabled: !isAdminPage,
  });
  // Empty string disables the query via the hook's `enabled` guard: until the
  // canonical slug loads, on admin pages, and wherever the reports tab is
  // hidden outright (its count can no longer change what renders).
  const reportsCommunitySlug =
    !isAdminPage && !isReportsTabHidden ? (community?.details?.slug ?? "") : "";
  const { data: publishedReports } = usePublishedReports(reportsCommunitySlug);
  const programsCount = programs?.length ?? 0;
  const publishedReportsCount = publishedReports?.length ?? 0;

  const isFinancialsEnabled = FINANCIALS_ENABLED_COMMUNITIES.includes(communityId);

  const visibleNavigationItems = useMemo(() => {
    return NAVIGATION_ITEMS.filter((item) => {
      if (override?.hiddenTabs?.includes(item.id)) {
        return false;
      }
      // In whitelabel mode, always show funding opportunities (it's the landing page).
      // In normal mode, hide it if the community has no programs at all (live or not).
      if (item.id === "funding-opportunities" && programsCount === 0 && !isWhitelabel) {
        return false;
      }
      // Show browse applications if the community has at least one program (live or ended)
      if (item.id === "browse-applications" && programsCount === 0) {
        return false;
      }
      // Show reports only when the community has published reports
      if (item.id === "reports" && publishedReportsCount === 0) {
        return false;
      }
      // Show financials only for enabled communities with programs
      if (item.id === "financials" && (!isFinancialsEnabled || programsCount === 0)) {
        return false;
      }
      return true;
    });
  }, [programsCount, publishedReportsCount, isWhitelabel, isFinancialsEnabled, override]);

  // No match means no highlight. A path that belongs to no visible tab (say
  // /community/<id>/projects where the funded-projects tab is hidden) is not a
  // reason to light up an unrelated tab the reader is not on.
  const activeItemId = useMemo(
    () => visibleNavigationItems.find((item) => item.isActive(segment))?.id,
    [visibleNavigationItems, segment]
  );

  const activeLinkRef = useCallback((node: HTMLAnchorElement | null) => {
    if (node?.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, []);

  if (isAdminPage) return null;

  return (
    <div className="flex flex-row flex-nowrap overflow-x-auto scrollbar-none pt-8 border-b border-gray-200 dark:border-zinc-700 justify-start items-center gap-6 h-max w-full">
      {visibleNavigationItems.map(({ id, path, Icon, showNewTag }) => {
        const href = path(communityId);
        const active = id === activeItemId;
        return (
          <Link
            key={id}
            ref={active ? activeLinkRef : undefined}
            href={getPathWithProgramId(programId, href)}
            className={cn(baseLinkStyle, active ? activeLinkStyle : inactiveLinkStyle)}
          >
            <Icon
              className={cn(
                "w-6 h-6 transition-colors duration-200",
                active ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400"
              )}
            />
            {override?.tabLabels?.[id] ?? COMMUNITY_NAV_LABELS[id]}
            {showNewTag ? <NewTag /> : null}
          </Link>
        );
      })}
    </div>
  );
};
