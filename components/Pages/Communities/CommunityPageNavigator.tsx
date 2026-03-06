"use client";
import { ChartLine, DollarSign, LandPlot, SquareUser, Wallet } from "lucide-react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { useFundingOpportunitiesCount } from "@/hooks/useFundingOpportunitiesCount";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { useWhitelabel } from "@/utilities/whitelabel-context";

const activeLinkStyle =
  "text-gray-900 dark:text-white border-b-4 border-b-gray-900 dark:border-b-white";
const inactiveLinkStyle =
  "text-gray-500 dark:text-zinc-400 border-b-4 border-b-transparent hover:text-gray-700 dark:hover:text-zinc-300";
const baseLinkStyle =
  "flex flex-row items-center gap-3 p-3 max-lg:w-full rounded-none text-base font-normal leading-6 w-max transition-colors duration-200";

const NewTag = () => {
  return (
    <div className="rounded-2xl py-1 px-3 bg-brand-blue dark:bg-brand-blue/80 text-white dark:text-zinc-100 text-xs font-bold">
      New!
    </div>
  );
};

type NavigationItem = {
  readonly id: string;
  readonly path: (communityId: string) => string;
  readonly title: (communityName: string) => string;
  readonly Icon: React.ElementType;
  readonly isActive: (pathname: string) => boolean;
  readonly showNewTag?: boolean;
};

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    id: "funding-opportunities",
    path: (communityId: string) => PAGES.COMMUNITY.FUNDING_OPPORTUNITIES(communityId),
    title: () => "Funding opportunities",
    Icon: DollarSign,
    isActive: (pathname: string) => pathname.includes("/funding-opportunities"),
  },
  {
    id: "community-projects",
    path: (communityId: string) => PAGES.COMMUNITY.PROJECTS(communityId),
    title: (communityName: string) => `View ${communityName} community projects`,
    Icon: SquareUser,
    isActive: (pathname: string) =>
      !pathname.includes("/impact") &&
      !pathname.includes("/project-discovery") &&
      !pathname.includes("/updates") &&
      !pathname.includes("/donate") &&
      !pathname.includes("/funding-opportunities") &&
      !pathname.includes("/financials"),
  },
  {
    id: "milestone-updates",
    path: (communityId: string) => PAGES.COMMUNITY.UPDATES(communityId),
    title: () => "Milestone updates",
    Icon: LandPlot,
    isActive: (pathname: string) => pathname.includes("/updates"),
  },
  {
    id: "impact",
    path: (communityId: string) => PAGES.COMMUNITY.IMPACT(communityId),
    title: () => "Impact",
    Icon: ChartLine,
    isActive: (pathname: string) => pathname.includes("/impact"),
  },
  {
    id: "financials",
    path: (communityId: string) => PAGES.COMMUNITY.FINANCIALS(communityId),
    title: () => "Financials",
    Icon: Wallet,
    isActive: (pathname: string) => pathname.includes("/financials"),
    showNewTag: true,
  },
] as const;

const getPathWithProgramId = (program: string | null, basePath: string) => {
  return program ? `${basePath}?programId=${program}` : basePath;
};

export const CommunityPageNavigator = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const communityId = params.communityId as string;
  const rawPathname = usePathname();
  const { isWhitelabel, isUmbrella, communitySlug } = useWhitelabel();
  const programId = searchParams.get("programId");
  // In whitelabel mode, the middleware rewrites the root to /community/<slug>/funding-opportunities
  // but usePathname() still returns "/" (domained) or "/<slug>" (umbrella).
  // Normalize so tab highlighting works correctly.
  const isWhitelabelRoot =
    isWhitelabel &&
    (rawPathname === "/" ||
      rawPathname === "" ||
      (isUmbrella && communitySlug && rawPathname === `/${communitySlug}`));
  const pathname = isWhitelabelRoot ? "/funding-opportunities" : rawPathname;

  // Check if we're on an admin page early to avoid unnecessary data fetching
  const isAdminPage = pathname.includes("/manage");

  const { data: community } = useCommunityDetails(communityId);
  // Skip fetching funding opportunities count on admin pages
  const { data: fundingOpportunitiesCount } = useFundingOpportunitiesCount({
    communityUid: community?.uid,
    enabled: !isAdminPage,
  });
  // Skip fetching programs on admin pages - the component returns null anyway
  const { data: programs } = useCommunityPrograms(communityId, {
    enabled: !isAdminPage,
  });
  const programsCount = programs?.length ?? 0;

  const visibleNavigationItems = useMemo(() => {
    return NAVIGATION_ITEMS.filter((item) => {
      // In whitelabel/umbrella mode, always show funding opportunities (it's the landing page)
      // In normal mode, hide it if there are no opportunities
      if (item.id === "funding-opportunities" && fundingOpportunitiesCount === 0 && !isWhitelabel) {
        return false;
      }
      // Hide financials tab if there are no programs
      if (item.id === "financials" && programsCount === 0) {
        return false;
      }
      return true;
    });
  }, [fundingOpportunitiesCount, programsCount, isWhitelabel]);

  if (isAdminPage) return null;

  return (
    <div className="flex flex-row max-md:flex-col flex-wrap pt-8 border-b border-gray-200 dark:border-zinc-700 justify-start items-center gap-6 h-max">
      {visibleNavigationItems.map(({ id, path, title, Icon, isActive, showNewTag }) => {
        const href = path(communityId);
        return (
          <Link
            key={id}
            href={getPathWithProgramId(programId, href)}
            className={cn(baseLinkStyle, isActive(pathname) ? activeLinkStyle : inactiveLinkStyle)}
          >
            <Icon
              className={cn(
                "w-6 h-6 transition-colors duration-200",
                isActive(pathname)
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-zinc-400"
              )}
            />
            {title(community?.details?.name || "")}
            {showNewTag ? <NewTag /> : null}
          </Link>
        );
      })}
    </div>
  );
};
