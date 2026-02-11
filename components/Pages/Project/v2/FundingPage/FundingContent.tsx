"use client";

import { CheckCircleIcon, PlusIcon } from "@heroicons/react/20/solid";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
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
 * Format a date range as "Apr - Aug 2024" or just "Apr 2024" if only start
 */
function formatDateRange(
  startDate: string | undefined | null,
  endDate: string | undefined | null
): string {
  if (!startDate && !endDate) return "";

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && end) {
    const startMonth = start.toLocaleDateString("en-US", { month: "short" });
    const endMonth = end.toLocaleDateString("en-US", { month: "short" });
    const endYear = end.getFullYear();
    // If same year, show "Apr - Aug 2024", otherwise "Apr 2023 - Aug 2024"
    if (start.getFullYear() === end.getFullYear()) {
      return `${startMonth} - ${endMonth} ${endYear}`;
    }
    return `${startMonth} ${start.getFullYear()} - ${endMonth} ${endYear}`;
  }

  if (start) {
    return start.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  if (end) {
    return end.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  return "";
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
  const rawAmount = grant.details?.amount?.trim() || "";

  // Parse amount: extract numeric part and currency suffix
  // Matches: "5686.59 USD", "40K USDC", "2500 ARB", "80000", "40K"
  const amountMatch = rawAmount.match(/^([\d,.]+[KMBTkmbt]?)\s*([a-zA-Z]{2,})?$/);
  const numericPart = amountMatch?.[1] || rawAmount;
  const currencyInAmount = amountMatch?.[2] || "";

  // Check if numeric part is already formatted (like "40K", "5M")
  const isAlreadyFormatted = /[KMBTkmbt]$/.test(numericPart);
  // Parse the numeric value (remove commas for parsing)
  const cleanNumber = numericPart.replace(/,/g, "").replace(/[KMBTkmbt]$/, "");
  const multiplier = /[Kk]$/.test(numericPart)
    ? 1000
    : /[Mm]$/.test(numericPart)
      ? 1e6
      : /[Bb]$/.test(numericPart)
        ? 1e9
        : /[Tt]$/.test(numericPart)
          ? 1e12
          : 1;
  const amountValue = Number(cleanNumber) * multiplier;
  const isValidNumber = !Number.isNaN(amountValue) && amountValue !== 0;
  const hasAmount = rawAmount && rawAmount !== "0";

  // Format the display amount
  const displayAmount = isAlreadyFormatted
    ? numericPart
    : isValidNumber
      ? formatCurrency(amountValue)
      : numericPart;
  // Use currency from the amount string, or from grant.details.currency
  const displayCurrency = currencyInAmount || grant.details?.currency || "";

  // Date range for display
  const dateRange = formatDateRange(grant.details?.startDate, grant.details?.completedAt);
  const progressPercent = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

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
      {/* Row 1: Logo + Title/Community + Completed badge */}
      <div className="flex items-center gap-3">
        {grant.community?.details?.imageURL && (
          <Image
            src={grant.community.details.imageURL}
            alt={grant.community.details.name || "Community"}
            width={40}
            height={40}
            className="rounded-full object-cover shrink-0"
            unoptimized
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {grant.details?.title || "Untitled Grant"}
          </h3>
          {grant.community?.details?.name && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {grant.community.details.name}
            </p>
          )}
        </div>
        {grant.completed && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0">
            <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Completed
          </span>
        )}
      </div>

      {/* Row 2: Amount + Date range */}
      {(hasAmount || dateRange) && (
        <div className="flex items-center justify-between text-sm gap-2">
          <span className="font-medium text-gray-900 dark:text-white">
            {hasAmount ? `$${displayAmount} ${displayCurrency}` : ""}
          </span>
          {dateRange && (
            <span className="text-gray-500 dark:text-gray-400 text-right">{dateRange}</span>
          )}
        </div>
      )}

      {/* Row 3: Milestones progress bar */}
      {totalMilestones > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">Milestones</span>
          <div className="flex-1 h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white shrink-0">
            {completedMilestones}/{totalMilestones}
          </span>
        </div>
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

  const { isProjectAdmin, isProjectOwner } = useProjectPermissions();
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin);
  const { communities } = useCommunitiesStore();
  const isCommunityAdminOfSome = communities.length !== 0;
  const isAuthorized =
    isProjectOwner ||
    isProjectAdmin ||
    isContractOwner ||
    isCommunityAdmin ||
    isCommunityAdminOfSome;

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

      {/* Grants grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        data-testid="grants-list"
      >
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
