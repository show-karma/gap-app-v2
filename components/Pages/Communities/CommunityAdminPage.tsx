"use client";
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChartBarIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  FlagIcon,
  GlobeAltIcon,
  IdentificationIcon,
  LockClosedIcon,
  Square2StackIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/Utilities/Button";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { Permission } from "@/src/core/rbac/types/permission";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

interface AdminCardProps {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  index: number;
}

const AdminCard = ({
  href,
  label,
  description,
  icon,
  iconBg,
  iconColor,
  index,
}: AdminCardProps) => (
  <Link
    href={href}
    className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
    style={{ animationDelay: `${index * 60}ms` }}
  >
    <div
      className={cn(
        "relative flex items-start gap-4 p-5 rounded-xl",
        "border border-border/60 bg-card",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.04] hover:border-border",
        "dark:hover:shadow-black/20 dark:hover:border-border/80",
        "animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      )}
      style={{ animationDelay: `${index * 60}ms`, animationDuration: "400ms" }}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center w-10 h-10 rounded-lg",
          "transition-transform duration-300 group-hover:scale-110",
          iconBg
        )}
      >
        <div className={iconColor}>{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground leading-tight">{label}</h3>
          <ChevronRightIcon className="w-4 h-4 shrink-0 text-muted-foreground/40 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all duration-300" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  </Link>
);

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }, (_, i) => (
      <div
        key={i}
        className="flex items-start gap-4 p-5 rounded-xl border border-border/40 bg-card animate-pulse"
      >
        <div className="w-10 h-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2.5 pt-0.5">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted/60" />
        </div>
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
  iconBg: string;
  iconColor: string;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    href: PAGES.ADMIN.FUNDING_PLATFORM,
    label: "Funding Platform",
    description: "Review and manage funding applications",
    icon: <CurrencyDollarIcon className="w-5 h-5" />,
    requiredPermissions: [Permission.PROGRAM_VIEW],
    iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    href: PAGES.ADMIN.EDIT_CATEGORIES,
    label: "Categories",
    description: "Manage and organize community categories",
    icon: <Square2StackIcon className="w-5 h-5" />,
    requiredPermissions: [Permission.COMMUNITY_EDIT],
    iconBg: "bg-violet-50 dark:bg-violet-950/50",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    href: PAGES.ADMIN.MILESTONES,
    label: "Milestones",
    description: "Track and update project milestones",
    icon: <FlagIcon className="w-5 h-5" />,
    requiredPermissions: [Permission.MILESTONE_VIEW_ALL],
    iconBg: "bg-amber-50 dark:bg-amber-950/50",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    href: PAGES.ADMIN.MANAGE_INDICATORS,
    label: "Impact Measurement",
    description: "Setup and manage impact indicators",
    icon: <ChartBarIcon className="w-5 h-5" />,
    requiredPermissions: [Permission.COMMUNITY_EDIT],
    iconBg: "bg-sky-50 dark:bg-sky-950/50",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    href: PAGES.ADMIN.TRACKS,
    label: "Tracks",
    description: "Manage tracks and assign them to programs",
    icon: <TagIcon className="w-5 h-5" />,
    requiredPermissions: [Permission.COMMUNITY_EDIT],
    iconBg: "bg-rose-50 dark:bg-rose-950/50",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    href: PAGES.ADMIN.EDIT_PROJECTS,
    label: "Projects",
    description: "Manage your projects and assign regions",
    icon: <GlobeAltIcon className="w-5 h-5" />,
    requiredPermissions: [Permission.COMMUNITY_EDIT],
    iconBg: "bg-teal-50 dark:bg-teal-950/50",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  {
    href: PAGES.ADMIN.PAYOUTS,
    label: "Payouts",
    description: "Manage payout addresses and amounts",
    icon: <BanknotesIcon className="w-5 h-5" />,
    requiredPermissions: [Permission.COMMUNITY_EDIT],
    iconBg: "bg-lime-50 dark:bg-lime-950/50",
    iconColor: "text-lime-600 dark:text-lime-400",
  },
  {
    href: PAGES.ADMIN.PROGRAM_SCORES,
    label: "Program Scores",
    description: "Upload CSV scores for program participants",
    icon: <ArrowTrendingUpIcon className="w-5 h-5" />,
    requiredPermissions: [Permission.COMMUNITY_EDIT],
    iconBg: "bg-indigo-50 dark:bg-indigo-950/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    href: PAGES.ADMIN.KYC_SETTINGS,
    label: "KYC/KYB Settings",
    description: "Configure identity verification for grantees",
    icon: <IdentificationIcon className="w-5 h-5" />,
    requiredPermissions: [Permission.COMMUNITY_EDIT],
    iconBg: "bg-orange-50 dark:bg-orange-950/50",
    iconColor: "text-orange-600 dark:text-orange-400",
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

  const visibleItems = useMemo(() => {
    if (isLoading) return [];
    return NAVIGATION_ITEMS.filter((item) => canAny(item.requiredPermissions));
  }, [canAny, isLoading]);

  const hasAnyAccess = visibleItems.length > 0;

  return (
    <div className="w-full max-w-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Community Dashboard
        </h1>
        {hasAnyAccess && !isLoading && (
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your community settings and programs
          </p>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : hasAnyAccess ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleItems.map((item, index) => (
            <AdminCard
              key={item.label}
              href={item.href(slug)}
              label={item.label}
              description={item.description}
              icon={item.icon}
              iconBg={item.iconBg}
              iconColor={item.iconColor}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-5">
            <LockClosedIcon className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground text-center">No access</p>
          <p className="mt-1.5 text-sm text-muted-foreground text-center max-w-sm">
            You don&apos;t have permission to access management features for this community.
          </p>
          <Button className="mt-5" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      )}
    </div>
  );
};
