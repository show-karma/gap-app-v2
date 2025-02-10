"use client";
import { FolderIcon } from "@/components/Icons/Folder";
import { Target2Icon } from "@/components/Icons/Target2";
import { getCommunityBySlug } from "@/utilities/gapIndexerApi/getCommunityBySlug";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const activeLinkStyle =
  "text-brand-darkblue font-bold dark:text-zinc-200 dark:bg-zinc-600 border-b border-b-4 border-b-brand-blue";
const inactiveLinkStyle =
  "text-gray-600 font-normal dark:text-zinc-400 border-b border-b-4 border-b-transparent";
const baseLinkStyle =
  "flex flex-row items-center gap-2 px-3 py-2 max-lg:w-full rounded-none text-base font-semibold font-['Inter'] leading-normal w-max";

const NewTag = () => {
  return (
    <div className="rounded-2xl py-1 px-3 bg-brand-blue text-white text-xs font-bold">
      New!
    </div>
  );
};

export const CommunityPageNavigator = () => {
  const params = useParams();
  const communityId = params.communityId as string;
  const pathname = usePathname();
  const { data: community } = useQuery({
    queryKey: ["community", communityId],
    queryFn: () => getCommunityBySlug(communityId),
  });
  const isAdminPage = pathname.includes("/admin");
  if (isAdminPage) {
    return null;
  }
  const isImpactPage = pathname.includes("/impact");
  const isProjectDiscover = pathname.includes("/project-discovery");

  return (
    <div className="flex-row max-md:flex-col flex-wrap px-1.5 py-2 rounded-lg justify-start items-center gap-4 flex h-max">
      <Link
        href={PAGES.COMMUNITY.ALL_GRANTS(communityId)}
        className={cn(
          baseLinkStyle,
          !(isImpactPage || isProjectDiscover)
            ? activeLinkStyle
            : inactiveLinkStyle
        )}
      >
        <FolderIcon
          className={cn(
            "w-6 h-6",
            !(isImpactPage || isProjectDiscover)
              ? "text-brand-blue"
              : "text-brand-darkblue"
          )}
        />
        View all {community?.details?.data.name} Community Projects
      </Link>
      <Link
        href={PAGES.COMMUNITY.IMPACT(communityId)}
        className={cn(
          baseLinkStyle,
          isImpactPage ? activeLinkStyle : inactiveLinkStyle
        )}
      >
        <Target2Icon
          className={cn(
            "w-6 h-6",
            isImpactPage ? "text-brand-blue" : "text-brand-darkblue"
          )}
        />
        Learn about their impact <NewTag />
      </Link>
    </div>
  );
};
