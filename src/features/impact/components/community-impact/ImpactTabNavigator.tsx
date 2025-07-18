"use client";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const activeLinkStyle =
  "text-slate-700 dark:text-zinc-200 bg-white rounded-md dark:bg-zinc-600";
const inactiveLinkStyle = "text-slate-500 dark:text-zinc-400 bg-transparent";
const baseLinkStyle =
  "px-3 py-2 max-lg:w-full rounded-md text-base font-semibold font-['Inter'] leading-normal w-max";

export const ImpactTabNavigator = () => {
  const params = useParams();
  const communityId = params.communityId as string;
  const pathname = usePathname();
  const isProjectDiscovery = pathname.includes("/project-discovery");

  return (
    <div className="flex-row max-lg:flex-col px-1.5 py-2 rounded-lg bg-gray-100 dark:bg-zinc-900 justify-start items-center gap-4 flex h-max w-max max-w-full">
      <Link
        href={PAGES.COMMUNITY.IMPACT(communityId)}
        className={cn(
          baseLinkStyle,
          !isProjectDiscovery ? activeLinkStyle : inactiveLinkStyle
        )}
        aria-label="View impact"
        tabIndex={0}
      >
        Program Impact
      </Link>
      <Link
        href={PAGES.COMMUNITY.PROJECT_DISCOVERY(communityId)}
        className={cn(
          baseLinkStyle,
          isProjectDiscovery ? activeLinkStyle : inactiveLinkStyle
        )}
        aria-label="Project Discovery"
        tabIndex={0}
      >
        Project Discovery
      </Link>
    </div>
  );
};
