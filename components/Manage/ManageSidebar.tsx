"use client";

import {
  ArrowLeftRight,
  Banknote,
  BarChart2,
  CircleDollarSign,
  CreditCard,
  ExternalLink,
  Flag,
  Globe,
  Home,
  LayoutGrid,
  Mail,
  Tag,
  TrendingUp,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";
import { useFundingPrograms } from "@/hooks/useFundingPlatform";
import { Link } from "@/src/components/navigation/Link";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { Role } from "@/src/core/rbac/types";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { useWhitelabel } from "@/utilities/whitelabel-context";

const ROLE_LABELS: Partial<Record<Role, string>> = {
  [Role.SUPER_ADMIN]: "Super Admin",
  [Role.REGISTRY_ADMIN]: "Registry Admin",
  [Role.COMMUNITY_ADMIN]: "Community Admin",
  [Role.PROGRAM_ADMIN]: "Program Admin",
  [Role.PROGRAM_CREATOR]: "Program Creator",
  [Role.PROGRAM_REVIEWER]: "Reviewer",
  [Role.MILESTONE_REVIEWER]: "Reviewer",
};

interface NavItem {
  href: (slug: string) => string;
  matchSegment: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  communityAdminOnly?: boolean;
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
        icon: CircleDollarSign,
      },
      {
        href: PAGES.ADMIN.MILESTONES,
        matchSegment: "milestones-report",
        label: "Milestones",
        icon: Flag,
      },
      {
        href: PAGES.ADMIN.CONTROL_CENTER,
        matchSegment: "control-center",
        label: "Control Center",
        icon: Banknote,
      },
      {
        href: PAGES.ADMIN.PROGRAM_SCORES,
        matchSegment: "program-scores",
        label: "Program Scores",
        icon: TrendingUp,
      },
      {
        href: PAGES.ADMIN.SEND_EMAIL,
        matchSegment: "send-email",
        label: "Send Email",
        icon: Mail,
        communityAdminOnly: true,
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
        icon: LayoutGrid,
      },
      {
        href: PAGES.ADMIN.TRACKS,
        matchSegment: "tracks",
        label: "Tracks",
        icon: Tag,
      },
      {
        href: PAGES.ADMIN.EDIT_PROJECTS,
        matchSegment: "edit-projects",
        label: "Projects",
        icon: Globe,
      },
      {
        href: PAGES.ADMIN.MANAGE_INDICATORS,
        matchSegment: "manage-indicators",
        label: "Impact Measurement",
        icon: BarChart2,
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
        icon: CreditCard,
      },
    ],
  },
];

const REVIEWER_SEGMENTS = new Set(["funding-platform", "milestones-report"]);

function isActiveRoute(pathname: string, matchSegment: string, slug: string): boolean {
  const itemPath = `${PAGES.ADMIN.ROOT(slug)}/${matchSegment}`;
  return pathname.startsWith(itemPath);
}

function isDashboardRoute(pathname: string, slug: string): boolean {
  const managePath = PAGES.ADMIN.ROOT(slug);
  return pathname === managePath || pathname === `${managePath}/`;
}

interface ManageSidebarProps {
  communityId: string;
  community: Community;
}

function useSidebarCounts(communityId: string) {
  const { programs } = useFundingPrograms(communityId);

  return useMemo(() => {
    const counts: Record<string, number> = {};
    if (programs && programs.length > 0) {
      const pendingApps = programs.reduce(
        (sum, p) => sum + (p.metrics?.pendingApplications || 0),
        0
      );
      if (pendingApps > 0) counts["funding-platform"] = pendingApps;
    }
    return counts;
  }, [programs]);
}

function CommunitySwitcher({
  currentSlug,
  communityName,
  communityLogo,
  roleLabel,
}: {
  currentSlug: string;
  communityName: string;
  communityLogo?: string;
  roleLabel?: string;
}) {
  const router = useRouter();
  const { communities } = useDashboardAdmin();
  const hasSwitcher = communities.length > 1;

  return (
    // Expanded: single row — [logo] [name+role] [switcher]
    // Collapsed: column — [logo] then [switcher] stacked
    <div className="flex items-center gap-2 px-2 overflow-hidden group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:overflow-visible">
      {/* Logo — always visible */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden">
        {communityLogo ? (
          <img src={communityLogo} alt={communityName} className="size-full object-cover" />
        ) : (
          <span className="text-sm font-bold">{communityName.charAt(0).toUpperCase()}</span>
        )}
      </div>

      {/* Name + role — hidden in icon mode */}
      <div className="grid flex-1 min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
        <span className="text-sm font-semibold truncate text-sidebar-foreground">
          {communityName}
        </span>
        {roleLabel && (
          <span className="text-xs truncate text-sidebar-foreground/50">{roleLabel}</span>
        )}
      </div>

      {/* Switcher — only rendered when user admins multiple communities */}
      {hasSwitcher && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md",
                "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                "group-data-[collapsible=icon]:size-8"
              )}
              aria-label="Switch community"
            >
              <ArrowLeftRight className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="min-w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch community
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {communities.map((c) => (
              <DropdownMenuItem
                key={c.slug}
                onSelect={() => router.push(c.manageUrl)}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  c.slug === currentSlug && "bg-sidebar-accent"
                )}
              >
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden">
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.name} className="size-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold">{c.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="truncate text-sm">{c.name}</span>
                {c.slug === currentSlug && (
                  <span className="ml-auto text-xs text-muted-foreground">Current</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function ManageSidebar({ communityId, community }: ManageSidebarProps) {
  const rawPathname = usePathname();
  const { isWhitelabel } = useWhitelabel();
  const { roles, isCommunityAdmin, isProgramAdmin, isReviewer, isRegistryAdmin, isLoading } =
    usePermissionContext();
  const badgeCounts = useSidebarCounts(communityId);

  const slug = community?.details?.slug || communityId;
  const communityPrefix = `/community/${slug}`;
  const pathname =
    isWhitelabel && !rawPathname.startsWith(communityPrefix)
      ? `${communityPrefix}${rawPathname}`
      : rawPathname;

  const hasAdminAccess = isCommunityAdmin || isProgramAdmin || isRegistryAdmin;
  const hasReviewerAccess = isReviewer;
  const roleLabel = ROLE_LABELS[roles.primaryRole] ?? "";

  const visibleGroups = useMemo(() => {
    if (isLoading || (!hasAdminAccess && !hasReviewerAccess)) return [];
    if (hasAdminAccess) {
      if (!isCommunityAdmin) {
        return NAV_GROUPS.map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.communityAdminOnly),
        })).filter((group) => group.items.length > 0);
      }
      return NAV_GROUPS;
    }
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => REVIEWER_SEGMENTS.has(item.matchSegment)),
    })).filter((group) => group.items.length > 0);
  }, [isLoading, hasAdminAccess, hasReviewerAccess, isCommunityAdmin]);

  const communityName = community?.details?.name || communityId;
  const communityLogo = community?.details?.imageURL || community?.details?.logoUrl;
  const isDashboard = isDashboardRoute(pathname, slug);

  return (
    <Sidebar collapsible="icon" style={{ top: "var(--navbar-height)", bottom: 0, height: "auto" }}>
      {/* Community identity + switcher */}
      <SidebarHeader className="pt-3">
        <CommunitySwitcher
          currentSlug={slug}
          communityName={communityName}
          communityLogo={communityLogo}
          roleLabel={roleLabel}
        />
      </SidebarHeader>

      <SidebarContent>
        {/* Overview */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isDashboard} tooltip="Overview">
                  <Link href={PAGES.ADMIN.ROOT(slug)}>
                    <Home />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Nav groups */}
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(pathname, item.matchSegment, slug);
                  const badgeCount = badgeCounts[item.matchSegment];
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link href={item.href(slug)}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {badgeCount > 0 && <SidebarMenuBadge>{badgeCount}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Back to community */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="View Public Page">
              <Link
                href={PAGES.COMMUNITY.ALL_GRANTS(slug)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink />
                <span>View Public Page</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
