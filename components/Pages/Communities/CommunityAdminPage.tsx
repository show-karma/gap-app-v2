"use client";
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChartBarIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  FlagIcon,
  GlobeAltIcon,
  Square2StackIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/Utilities/Button";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { Permission } from "@/src/core/rbac/types/permission";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

interface AdminButtonProps {
  href: string;
  label: string;
  description: string;
  colorClass: string;
  icon?: React.ReactNode;
}

const AdminButton = ({ href, label, description, colorClass, icon }: AdminButtonProps) => (
  <Link
    href={href}
    className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
  >
    <div
      className={cn(
        "flex flex-col gap-2 p-6 rounded-lg transition-all duration-200 focus:scale-105",
        "bg-white dark:bg-zinc-900 border-2 border-primary-500/20 hover:border-primary-500",
        "dark:border-primary-500/20 dark:hover:border-primary-500",
        "hover:shadow-lg hover:shadow-primary-500/5",
        colorClass
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && <div className="text-primary-500">{icon}</div>}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{label}</h3>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-primary-500 group-hover:translate-x-1 transition-transform duration-200" />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  </Link>
);

const LoadingSkeleton = () => (
  <div className="flex flex-row flex-wrap gap-8">
    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
      <div key={i} className="w-[300px]">
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    ))}
  </div>
);

interface NavigationItem {
  href: (slug: string) => string;
  label: string;
  description: string;
  icon: React.ReactNode;
  requiredPermissions: Permission[];
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    href: PAGES.ADMIN.FUNDING_PLATFORM,
    label: "Funding Platform",
    description: "Review and manage funding applications",
    icon: <CurrencyDollarIcon className="w-6 h-6" />,
    requiredPermissions: [Permission.PROGRAM_VIEW],
  },
  {
    href: PAGES.ADMIN.EDIT_CATEGORIES,
    label: "Categories",
    description: "Manage and organize community categories",
    icon: <Square2StackIcon className="w-6 h-6" />,
    requiredPermissions: [Permission.COMMUNITY_EDIT],
  },
  {
    href: PAGES.ADMIN.MILESTONES,
    label: "Milestones",
    description: "Track and update project milestones",
    icon: <FlagIcon className="w-6 h-6" />,
    requiredPermissions: [Permission.MILESTONE_VIEW_ALL],
  },
  {
    href: PAGES.ADMIN.MANAGE_INDICATORS,
    label: "Impact Measurement",
    description: "Setup and manage impact indicators",
    icon: <ChartBarIcon className="w-6 h-6" />,
    requiredPermissions: [Permission.COMMUNITY_EDIT],
  },
  {
    href: PAGES.ADMIN.TRACKS,
    label: "Tracks",
    description: "Manage tracks and assign them to programs",
    icon: <TagIcon className="w-6 h-6" />,
    requiredPermissions: [Permission.COMMUNITY_EDIT],
  },
  {
    href: PAGES.ADMIN.EDIT_PROJECTS,
    label: "Projects",
    description: "Manage your projects and assign regions",
    icon: <GlobeAltIcon className="w-6 h-6" />,
    requiredPermissions: [Permission.COMMUNITY_EDIT],
  },
  {
    href: PAGES.ADMIN.PAYOUTS,
    label: "Payouts",
    description: "Manage payout addresses and amounts",
    icon: <BanknotesIcon className="w-6 h-6" />,
    requiredPermissions: [Permission.COMMUNITY_EDIT],
  },
  {
    href: PAGES.ADMIN.PROGRAM_SCORES,
    label: "Program Scores",
    description: "Upload CSV scores for program participants",
    icon: <ArrowTrendingUpIcon className="w-6 h-6" />,
    requiredPermissions: [Permission.COMMUNITY_EDIT],
  },
];

export const CommunityAdminPage = ({
  communityId,
  community,
}: {
  communityId: string;
  community: Community;
}) => {
  const { canAny, isLoading } = usePermissionContext();

  const slug = community?.details?.slug || communityId;

  // Filter navigation items based on user permissions
  const visibleItems = useMemo(() => {
    if (isLoading) return [];
    return NAVIGATION_ITEMS.filter((item) => canAny(item.requiredPermissions));
  }, [canAny, isLoading]);

  const hasAnyAccess = visibleItems.length > 0;

  return (
    <div className="max-w-full w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Community Dashboard</h1>

      {isLoading ? (
        <LoadingSkeleton />
      ) : hasAnyAccess ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleItems.map((item) => (
            <AdminButton
              key={item.label}
              href={item.href(slug)}
              label={item.label}
              description={item.description}
              colorClass=""
              icon={item.icon}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
          <p className="text-gray-600 dark:text-gray-300 text-center">
            You don&apos;t have permission to access any management features for this community.
          </p>
          <Button className="mt-4" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      )}
    </div>
  );
};
