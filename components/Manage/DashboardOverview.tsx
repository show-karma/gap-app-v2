"use client";

import {
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { useFundingPrograms } from "@/hooks/useFundingPlatform";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href?: string;
  accentColor: string;
}

function MetricCard({ label, value, icon, href, accentColor }: MetricCardProps) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 transition-all",
        href && "hover:border-gray-300 dark:hover:border-zinc-600 hover:shadow-sm cursor-pointer"
      )}
    >
      <div className={cn("p-2.5 rounded-lg", accentColor)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

interface AttentionItemProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  urgency: "high" | "medium" | "low";
}

function AttentionItem({ title, description, href, icon, urgency }: AttentionItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group"
    >
      <div
        className={cn(
          "p-2 rounded-lg flex-shrink-0",
          urgency === "high" && "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
          urgency === "medium" && "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
          urgency === "low" && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0" />
    </Link>
  );
}

interface ProgramRowProps {
  name: string;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  isEnabled: boolean;
  applicationsHref: string;
  settingsHref: string;
}

function ProgramRow({
  name,
  totalApplications,
  pendingApplications,
  approvedApplications,
  isEnabled,
  applicationsHref,
}: ProgramRowProps) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-zinc-800 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
          <span
            className={cn(
              "px-1.5 py-0.5 text-[10px] font-medium rounded-full",
              isEnabled
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            )}
          >
            {isEnabled ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {totalApplications} total
          </span>
          {pendingApplications > 0 && (
            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              {pendingApplications} pending
            </span>
          )}
          <span className="text-xs text-green-600 dark:text-green-400">
            {approvedApplications} approved
          </span>
        </div>
      </div>
      <Link
        href={applicationsHref}
        className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1 flex-shrink-0"
      >
        View
        <ArrowRightIcon className="w-3 h-3" />
      </Link>
    </div>
  );
}

export function DashboardOverview({ community }: { community: Community }) {
  const { communityId } = useParams() as { communityId: string };
  const { permissions, isCommunityAdmin, isProgramAdmin, isLoading: permissionsLoading } = usePermissionContext();
  const slug = community?.details?.slug || communityId;

  const hasAdminAccess = isCommunityAdmin || isProgramAdmin || permissions.length > 0;

  const {
    programs,
    isLoading: programsLoading,
  } = useFundingPrograms(communityId);

  const stats = useMemo(() => {
    if (!programs || programs.length === 0) {
      return {
        totalPrograms: 0,
        totalApplications: 0,
        pendingApplications: 0,
        approvedApplications: 0,
        activePrograms: 0,
      };
    }

    return programs.reduce(
      (acc, program) => {
        const metrics = program.metrics;
        const isActive = program.applicationConfig?.isEnabled || false;
        return {
          totalPrograms: acc.totalPrograms + 1,
          totalApplications: acc.totalApplications + (metrics?.totalApplications || 0),
          pendingApplications: acc.pendingApplications + (metrics?.pendingApplications || 0),
          approvedApplications: acc.approvedApplications + (metrics?.approvedApplications || 0),
          activePrograms: acc.activePrograms + (isActive ? 1 : 0),
        };
      },
      {
        totalPrograms: 0,
        totalApplications: 0,
        pendingApplications: 0,
        approvedApplications: 0,
        activePrograms: 0,
      }
    );
  }, [programs]);

  const attentionItems = useMemo(() => {
    const items: AttentionItemProps[] = [];

    if (stats.pendingApplications > 0) {
      items.push({
        title: `${stats.pendingApplications} application${stats.pendingApplications !== 1 ? "s" : ""} pending review`,
        description: "Applications are waiting for your review across all programs",
        href: PAGES.ADMIN.FUNDING_PLATFORM(slug),
        icon: <ClockIcon className="w-5 h-5" />,
        urgency: stats.pendingApplications > 5 ? "high" : "medium",
      });
    }

    // Check for programs without forms configured
    const unconfiguredPrograms = programs?.filter(
      (p) => !p.applicationConfig?.formSchema?.fields?.length
    );
    if (unconfiguredPrograms && unconfiguredPrograms.length > 0) {
      items.push({
        title: `${unconfiguredPrograms.length} program${unconfiguredPrograms.length !== 1 ? "s" : ""} need configuration`,
        description: "These programs don't have application forms set up yet",
        href: PAGES.ADMIN.FUNDING_PLATFORM(slug),
        icon: <ExclamationTriangleIcon className="w-5 h-5" />,
        urgency: "medium",
      });
    }

    if (items.length === 0 && stats.totalPrograms > 0) {
      items.push({
        title: "All caught up",
        description: "No items require your immediate attention",
        href: PAGES.ADMIN.FUNDING_PLATFORM(slug),
        icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
        urgency: "low",
      });
    }

    return items;
  }, [stats, programs, slug]);

  if (permissionsLoading || programsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Spinner />
      </div>
    );
  }

  if (!hasAdminAccess) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Welcome to your community dashboard
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Programs"
          value={stats.activePrograms}
          icon={<CurrencyDollarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          accentColor="bg-blue-50 dark:bg-blue-900/20"
          href={PAGES.ADMIN.FUNDING_PLATFORM(slug)}
        />
        <MetricCard
          label="Pending Review"
          value={stats.pendingApplications}
          icon={<ClockIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          accentColor="bg-orange-50 dark:bg-orange-900/20"
          href={PAGES.ADMIN.FUNDING_PLATFORM(slug)}
        />
        <MetricCard
          label="Total Applications"
          value={stats.totalApplications}
          icon={<ClipboardDocumentListIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          accentColor="bg-purple-50 dark:bg-purple-900/20"
        />
        <MetricCard
          label="Approved"
          value={stats.approvedApplications}
          icon={<FlagIcon className="w-5 h-5 text-green-600 dark:text-green-400" />}
          accentColor="bg-green-50 dark:bg-green-900/20"
        />
      </div>

      {/* Needs Your Attention */}
      {attentionItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">
            Needs Your Attention
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700 divide-y divide-gray-100 dark:divide-zinc-800">
            {attentionItems.map((item) => (
              <AttentionItem key={item.title} {...item} />
            ))}
          </div>
        </div>
      )}

      {/* Programs Quick View */}
      {programs && programs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Programs
            </h2>
            <Link
              href={PAGES.ADMIN.FUNDING_PLATFORM(slug)}
              className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
            >
              View all
              <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700 px-4">
            {programs.slice(0, 5).map((program) => (
              <ProgramRow
                key={program.programId}
                name={program.metadata?.title || program.name || "Untitled Program"}
                totalApplications={program.metrics?.totalApplications || 0}
                pendingApplications={program.metrics?.pendingApplications || 0}
                approvedApplications={program.metrics?.approvedApplications || 0}
                isEnabled={program.applicationConfig?.isEnabled || false}
                applicationsHref={PAGES.MANAGE.FUNDING_PLATFORM.APPLICATIONS(slug, program.programId)}
                settingsHref={PAGES.MANAGE.FUNDING_PLATFORM.SETUP(slug, program.programId)}
              />
            ))}
          </div>
          {programs.length > 5 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              +{programs.length - 5} more programs
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {(!programs || programs.length === 0) && (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700">
          <FolderOpenIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No programs yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Create your first funding program to get started.
          </p>
          <Link
            href={PAGES.ADMIN.FUNDING_PLATFORM(slug)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            Go to Funding Platform
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
