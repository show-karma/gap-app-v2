"use client";
import { ChartLine, Coins, LandPlot, SquareUser } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

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
  readonly path: (communityId: string) => string;
  readonly title: (communityName: string) => string;
  readonly Icon: React.ElementType;
  readonly isActive: (pathname: string) => boolean;
  readonly showNewTag?: boolean;
};

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    path: (communityId: string) => PAGES.COMMUNITY.FUNDING_OPPORTUNITIES(communityId),
    title: () => "Funding opportunities",
    Icon: Coins,
    isActive: (pathname: string) => pathname.includes("/funding-opportunities"),
  },
  {
    path: (communityId: string) => PAGES.COMMUNITY.ALL_GRANTS(communityId),
    title: (communityName: string) => `View ${communityName} community projects`,
    Icon: SquareUser,
    isActive: (pathname: string) =>
      !pathname.includes("/impact") &&
      !pathname.includes("/project-discovery") &&
      !pathname.includes("/updates") &&
      !pathname.includes("/donate") &&
      !pathname.includes("/funding-opportunities"),
  },
  {
    path: (communityId: string) => PAGES.COMMUNITY.UPDATES(communityId),
    title: () => "Milestone updates",
    Icon: LandPlot,
    isActive: (pathname: string) => pathname.includes("/updates"),
  },
  {
    path: (communityId: string) => PAGES.COMMUNITY.IMPACT(communityId),
    title: () => "Impact",
    Icon: ChartLine,
    isActive: (pathname: string) => pathname.includes("/impact"),
  },
] as const;

const getPathWithProgramId = (program: string | null, basePath: string) => {
  return program ? `${basePath}?programId=${program}` : basePath;
};

export const CommunityPageNavigator = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const communityId = params.communityId as string;
  const pathname = usePathname();
  const programId = searchParams.get("programId");
  const { data: community } = useCommunityDetails(communityId);

  const isAdminPage = pathname.includes("/admin");
  if (isAdminPage) return null;

  return (
    <div className="flex flex-row max-md:flex-col flex-wrap pt-8 border-b border-gray-200 dark:border-zinc-700 justify-start items-center gap-6 h-max">
      {NAVIGATION_ITEMS.map(({ path, title, Icon, isActive, showNewTag }) => (
        <Link
          key={path(communityId)}
          href={getPathWithProgramId(programId, path(communityId))}
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
      ))}
    </div>
  );
};
