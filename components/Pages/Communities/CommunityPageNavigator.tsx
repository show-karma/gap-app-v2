"use client";
import { getCommunityBySlug } from "@/utilities/gapIndexerApi/getCommunityBySlug";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const activeLinkStyle =
  "text-slate-700 dark:text-zinc-200 bg-white rounded-md dark:bg-zinc-600";
const inactiveLinkStyle = "text-slate-500 dark:text-zinc-400 bg-transparent";
const baseLinkStyle =
  "px-3 py-2 max-lg:w-full rounded-md text-base font-semibold font-['Inter'] leading-normal w-max";

export const CommunityPageNavigator = () => {
  const params = useParams();
  const communityId = params.communityId as string;
  const pathname = usePathname();
  const isImpactPage = pathname.includes("/impact");
  const { data: community } = useQuery({
    queryKey: ["community", communityId],
    queryFn: () => getCommunityBySlug(communityId),
  });
  const isAdminPage = pathname.includes("/admin");
  if (isAdminPage) {
    return null;
  }
  return (
    <div className="flex-row max-lg:flex-col px-1.5 py-2 rounded-lg bg-gray-100 dark:bg-zinc-900 justify-start items-center gap-4 flex h-max">
      <Link
        href={PAGES.COMMUNITY.ALL_GRANTS(communityId)}
        className={cn(
          baseLinkStyle,
          isImpactPage ? inactiveLinkStyle : activeLinkStyle
        )}
      >
        View all {community?.details?.data.name} Community Projects
      </Link>
      <Link
        href={PAGES.COMMUNITY.IMPACT(communityId)}
        className={cn(
          baseLinkStyle,
          isImpactPage ? activeLinkStyle : inactiveLinkStyle
        )}
      >
        Learn about their impact
      </Link>
    </div>
  );
};
