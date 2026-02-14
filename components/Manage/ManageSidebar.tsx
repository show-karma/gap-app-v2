"use client";

import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  Bars3Icon,
  ChartBarIcon,
  CurrencyDollarIcon,
  FlagIcon,
  GlobeAltIcon,
  HomeIcon,
  IdentificationIcon,
  Square2StackIcon,
  TagIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useFundingPrograms } from "@/hooks/useFundingPlatform";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

interface NavItem {
  href: (slug: string) => string;
  /** Pathname segment to match for active state (e.g. "funding-platform") */
  matchSegment: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Programs",
    items: [
      {
        href: PAGES.ADMIN.FUNDING_PLATFORM,
        matchSegment: "funding-platform",
        label: "Funding Platform",
        icon: CurrencyDollarIcon,
      },
      {
        href: PAGES.ADMIN.MILESTONES,
        matchSegment: "milestones-report",
        label: "Milestones",
        icon: FlagIcon,
      },
      {
        href: PAGES.ADMIN.PAYOUTS,
        matchSegment: "payouts",
        label: "Payouts",
        icon: BanknotesIcon,
      },
      {
        href: PAGES.ADMIN.PROGRAM_SCORES,
        matchSegment: "program-scores",
        label: "Program Scores",
        icon: ArrowTrendingUpIcon,
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        href: PAGES.ADMIN.EDIT_CATEGORIES,
        matchSegment: "edit-categories",
        label: "Categories",
        icon: Square2StackIcon,
      },
      {
        href: PAGES.ADMIN.TRACKS,
        matchSegment: "tracks",
        label: "Tracks",
        icon: TagIcon,
      },
      {
        href: PAGES.ADMIN.EDIT_PROJECTS,
        matchSegment: "edit-projects",
        label: "Projects",
        icon: GlobeAltIcon,
      },
      {
        href: PAGES.ADMIN.MANAGE_INDICATORS,
        matchSegment: "manage-indicators",
        label: "Impact Measurement",
        icon: ChartBarIcon,
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        href: PAGES.ADMIN.KYC_SETTINGS,
        matchSegment: "kyc-settings",
        label: "KYC/KYB",
        icon: IdentificationIcon,
      },
    ],
  },
];

function isActiveRoute(pathname: string, matchSegment: string, slug: string): boolean {
  const managePath = `/community/${slug}/manage`;
  const itemPath = `${managePath}/${matchSegment}`;
  return pathname.startsWith(itemPath);
}

function isDashboardRoute(pathname: string, slug: string): boolean {
  const managePath = `/community/${slug}/manage`;
  return pathname === managePath || pathname === `${managePath}/`;
}

interface ManageSidebarProps {
  communityId: string;
  community: Community;
}

/** Fetch badge counts for sidebar items */
function useSidebarCounts(communityId: string) {
  const { programs } = useFundingPrograms(communityId);

  return useMemo(() => {
    const counts: Record<string, number> = {};

    if (programs && programs.length > 0) {
      const pendingApps = programs.reduce(
        (sum, p) => sum + (p.metrics?.pendingApplications || 0),
        0
      );
      if (pendingApps > 0) {
        counts["funding-platform"] = pendingApps;
      }
    }

    return counts;
  }, [programs]);
}

export function ManageSidebar({ communityId, community }: ManageSidebarProps) {
  const pathname = usePathname();
  const { permissions, isCommunityAdmin, isProgramAdmin, isLoading } = usePermissionContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const badgeCounts = useSidebarCounts(communityId);

  const slug = community?.details?.slug || communityId;

  // Gate: user must have any admin-level access to see nav items.
  // Once gated, show ALL items (no per-item filtering) — matches original behavior.
  const hasAdminAccess = isCommunityAdmin || isProgramAdmin || permissions.length > 0;
  const visibleGroups = isLoading || !hasAdminAccess ? [] : NAV_GROUPS;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Community header */}
      <div className="px-4 py-5 border-b border-gray-200 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          {community?.details?.imageURL || community?.details?.logoUrl ? (
            <img
              src={community.details.imageURL || community.details.logoUrl}
              alt={community.details.name}
              className="w-8 h-8 rounded-lg object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span className="text-sm font-bold text-primary-700 dark:text-primary-300">
                {community?.details?.name?.charAt(0) || "C"}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {community?.details?.name || communityId}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Dashboard link */}
        <Link
          href={PAGES.ADMIN.ROOT(slug)}
          onClick={() => setIsMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-4",
            isDashboardRoute(pathname, slug)
              ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
          )}
        >
          <HomeIcon className="w-5 h-5 flex-shrink-0" />
          <span>Overview</span>
        </Link>

        {/* Nav groups */}
        {visibleGroups.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(pathname, item.matchSegment, slug);
                return (
                  <Link
                    key={item.label}
                    href={item.href(slug)}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-gray-200"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    {badgeCounts[item.matchSegment] && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 tabular-nums">
                        {badgeCounts[item.matchSegment]}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Back to community link */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-zinc-700">
        <Link
          href={`/community/${slug}`}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          <span>Back to Community</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-20 left-4 z-40 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-md"
        aria-label="Open navigation"
      >
        <Bars3Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-700 transform transition-transform duration-200 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-end p-2">
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
            aria-label="Close navigation"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 xl:w-64 flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-700 h-full">
        {sidebarContent}
      </aside>
    </>
  );
}
