"use client";

import { CheckCircleIcon, PlusIcon } from "@heroicons/react/20/solid";
import { CalendarIcon, FlagIcon, PlayIcon, WalletIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TrackTags } from "@/components/TrackTags";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { useOwnerStore } from "@/store";
import { useCommunitiesStore } from "@/store/communities";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import type { Grant } from "@/types/v2/grant";
import type { Project } from "@/types/v2/project";
import formatCurrency from "@/utilities/formatCurrency";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

interface FundingContentProps {
  project: Project;
  className?: string;
}

/**
 * Format a date relative to now (e.g., "2 months ago")
 */
function formatRelativeDate(date: string | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

/**
 * Format a date as "MMM YYYY" (e.g., "Jan 2024")
 */
function formatShortDate(date: string | undefined | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * GrantCard displays a single grant in the funding list with enhanced information
 */
function GrantCard({
  grant,
  project,
  isSelected,
}: {
  grant: Grant;
  project: Project;
  isSelected: boolean;
}) {
  // Calculate milestone progress
  const milestones = grant.milestones || [];
  const completedMilestones = milestones.filter((m) => m.completed).length;
  const totalMilestones = milestones.length;
  const hasAmount = grant.details?.amount && grant.details.amount !== "0";

  // Get last activity date (most recent between createdAt, updatedAt, or last milestone update)
  const lastActivity = grant.updatedAt || grant.createdAt;

  // Get tracks from selectedTrackIds (primary) or fallback to categories
  const selectedTrackIds = grant.details?.selectedTrackIds || [];
  const communityId = grant.communityUID || grant.community?.uid || "";
  const hasTrackIds = selectedTrackIds.length > 0 && communityId;

  // Get categories as fallback
  const categories = grant.categories || [];

  return (
    <Link
      href={PAGES.PROJECT.GRANT(project.details?.slug || project.uid || "", grant.uid)}
      className={cn(
        "flex flex-col gap-3 p-4 rounded-xl border transition-all hover:shadow-md",
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
      )}
      data-testid="grant-card"
    >
      {/* Top row: Community logo, title, status */}
      <div className="flex items-start gap-3">
        {grant.community?.details?.imageURL && (
          <Image
            src={grant.community.details.imageURL}
            alt={grant.community.details.name || "Community"}
            width={48}
            height={48}
            className="rounded-full object-cover shrink-0"
            unoptimized
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {grant.details?.title || "Untitled Grant"}
            </h3>
            {grant.completed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                Completed
              </span>
            )}
          </div>
          {grant.community?.details?.name && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {grant.community.details.name}
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        {/* Funding amount */}
        {hasAmount && (
          <div className="flex items-center gap-1.5">
            <WalletIcon className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(Number(grant.details?.amount || 0))}
            </span>
            {grant.details?.currency && (
              <span className="text-gray-500">{grant.details.currency}</span>
            )}
          </div>
        )}

        {/* Milestone progress */}
        {totalMilestones > 0 && (
          <div className="flex items-center gap-1.5">
            <FlagIcon className="h-4 w-4 text-gray-400" />
            <span>
              <span className="font-medium text-gray-900 dark:text-white">
                {completedMilestones}/{totalMilestones}
              </span>{" "}
              milestones
            </span>
          </div>
        )}

        {/* Start date */}
        {grant.details?.startDate && (
          <div className="flex items-center gap-1.5">
            <PlayIcon className="h-4 w-4 text-gray-400" />
            <span>Started {formatShortDate(grant.details.startDate)}</span>
          </div>
        )}

        {/* End date (completedAt) */}
        {grant.details?.completedAt && (
          <div className="flex items-center gap-1.5">
            <CheckCircleIcon className="h-4 w-4 text-gray-400" />
            <span>Ended {formatShortDate(grant.details.completedAt)}</span>
          </div>
        )}

        {/* Last activity */}
        {lastActivity && (
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            <span>Last Activity {formatRelativeDate(lastActivity)}</span>
          </div>
        )}
      </div>

      {/* Tracks (primary) or Categories (fallback) */}
      {hasTrackIds ? (
        <TrackTags communityId={communityId} trackIds={selectedTrackIds} />
      ) : (
        categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {categories.slice(0, 3).map((category) => (
              <span
                key={category}
                className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400"
              >
                {category}
              </span>
            ))}
            {categories.length > 3 && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400">
                +{categories.length - 3} more
              </span>
            )}
          </div>
        )
      )}
    </Link>
  );
}

/**
 * EmptyFundingState displays when there are no grants
 */
function EmptyFundingState({ isAuthorized, project }: { isAuthorized: boolean; project: Project }) {
  if (isAuthorized) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-5 rounded-lg border-2 border-dashed border-blue-600 bg-blue-50 dark:bg-zinc-900 p-8"
        data-testid="empty-funding-authorized"
      >
        <p className="text-center text-lg font-semibold text-gray-900 dark:text-white">
          Get started by adding your first funding
        </p>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 max-w-md">
          Track grants, milestones, and progress for your project. Add funding from your community
          programs to showcase your work.
        </p>
        <Link
          href={PAGES.PROJECT.SCREENS.NEW_GRANT(project.details?.slug || project.uid || "")}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add Funding
        </Link>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 p-8"
      data-testid="empty-funding-public"
    >
      <Image
        src="/images/comments.png"
        alt="No funding illustration"
        width={438}
        height={185}
        className="h-32 w-auto object-contain opacity-60"
        loading="lazy"
      />
      <p className="text-center text-lg font-semibold text-gray-900 dark:text-white">
        No funding yet
      </p>
      <p className="text-center text-sm text-gray-600 dark:text-gray-400 max-w-md">
        This project hasn&apos;t added any funding information yet. Check back later for updates on
        their grants and progress.
      </p>
    </div>
  );
}

/**
 * FundingContent displays the list of grants for a project.
 * This is the main content area for the Funding tab in the new v2 project profile.
 */
export function FundingContent({ project, className }: FundingContentProps) {
  const params = useParams();
  const selectedGrantUid = params.grantUid as string | undefined;

  const { isProjectAdmin } = useProjectPermissions();
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin);
  const { communities } = useCommunitiesStore();
  const isCommunityAdminOfSome = communities.length !== 0;
  const isAuthorized =
    isProjectAdmin || isContractOwner || isCommunityAdmin || isCommunityAdminOfSome;

  // Fetch grants using dedicated hook
  const { grants, isLoading } = useProjectGrants(project.uid || "");

  // Sort grants by creation date (most recent first)
  const sortedGrants = [...grants].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-4", className)} data-testid="funding-content-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-20 rounded-lg bg-gray-200 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (grants.length === 0) {
    return (
      <div className={className} data-testid="funding-content">
        <EmptyFundingState isAuthorized={isAuthorized} project={project} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)} data-testid="funding-content">
      {/* Header with Add button for authorized users */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Funding ({grants.length})
        </h2>
        {isAuthorized && (
          <Link
            href={PAGES.PROJECT.SCREENS.NEW_GRANT(project.details?.slug || project.uid || "")}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            data-testid="add-funding-button"
          >
            <PlusIcon className="h-4 w-4" />
            Add
          </Link>
        )}
      </div>

      {/* Grants list */}
      <div className="flex flex-col gap-3" data-testid="grants-list">
        {sortedGrants.map((grant) => (
          <GrantCard
            key={grant.uid}
            grant={grant}
            project={project}
            isSelected={grant.uid === selectedGrantUid}
          />
        ))}
      </div>
    </div>
  );
}
