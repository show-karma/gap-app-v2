"use client";
import { FolderIcon } from "@/components/Icons/Folder";
import { Target2Icon } from "@/components/Icons/Target2";
import { SparklesIcon } from "@/components/Icons/Sparkles";
import { BanknotesIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { getCommunityBySlug } from "@/utilities/gapIndexerApi/getCommunityBySlug";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";

const activeLinkStyle =
  "text-brand-darkblue dark:text-white font-bold border-b border-b-4 border-b-brand-blue dark:border-b-brand-blue";
const inactiveLinkStyle =
  "text-gray-600 dark:text-zinc-400 font-normal hover:text-brand-darkblue dark:hover:text-white border-b border-b-4 border-b-transparent";
const baseLinkStyle =
  "flex flex-row items-center gap-2 px-3 py-2 max-lg:w-full rounded-none text-base font-semibold font-['Inter'] leading-normal w-max transition-colors duration-200";

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
    path: (communityId: string) => PAGES.COMMUNITY.ALL_GRANTS(communityId),
    title: (communityName: string) =>
      `View all ${communityName} Community Projects`,
    Icon: FolderIcon,
    isActive: (pathname: string) =>
      !pathname.includes("/impact") &&
      !pathname.includes("/project-discovery") &&
      !pathname.includes("/updates"),
  },
  {
    path: (communityId: string) => PAGES.COMMUNITY.UPDATES(communityId),
    title: () => "Milestone Updates",
    Icon: ClipboardDocumentListIcon,
    isActive: (pathname: string) => pathname.includes("/updates"),
  },
  {
    path: (communityId: string) => PAGES.COMMUNITY.IMPACT(communityId),
    title: () => "Learn about their impact",
    Icon: Target2Icon,
    isActive: (pathname: string) => pathname.includes("/impact"),
    showNewTag: false,
  },
  {
    path: (communityId: string) => PAGES.COMMUNITY.IMPACT(communityId),
    title: () => "Donate to projects",
    Icon: BanknotesIcon,
    isActive: (pathname: string) => pathname.includes("/donate"),
    showNewTag: true,
  },
  // {
  //   path: (communityId: string) => `/community/${communityId}/karma-ai`,
  //   title: () => "Ask Karma AI",
  //   Icon: SparklesIcon,
  //   isActive: (pathname: string) => pathname.includes("/karma-ai"),
  // },
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
  const { data: community } = useQuery({
    queryKey: ["community", communityId],
    queryFn: () => getCommunityBySlug(communityId),
  });

  const isAdminPage = pathname.includes("/admin");
  if (isAdminPage) return null;

  return (
    <div className="flex-row max-md:flex-col flex-wrap px-1.5 pt-2 mb-[-1px] rounded-lg justify-start items-center gap-4 flex h-max">
      {NAVIGATION_ITEMS.map(({ path, title, Icon, isActive, showNewTag }) => (
        <Link
          key={path(communityId)}
          href={getPathWithProgramId(programId, path(communityId))}
          className={cn(
            baseLinkStyle,
            isActive(pathname) ? activeLinkStyle : inactiveLinkStyle
          )}
        >
          <Icon
            className={cn(
              "w-6 h-6 transition-colors duration-200",
              isActive(pathname)
                ? "text-brand-blue dark:text-brand-blue"
                : "text-brand-darkblue dark:text-zinc-400"
            )}
          />
          {title(community?.details?.data.name || "")}
          {showNewTag ? <NewTag /> : null}
        </Link>
      ))}
    </div>
  );
};
