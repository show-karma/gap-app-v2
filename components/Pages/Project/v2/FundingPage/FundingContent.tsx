"use client";

import { CheckCircleIcon, PlusIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunitiesStore } from "@/store/communities";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import type { Grant } from "@/types/v2/grant";
import type { Project } from "@/types/v2/project";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

interface FundingContentProps {
  project: Project;
  className?: string;
}

/**
 * GrantCard displays a single grant in the funding list
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
  return (
    <Link
      href={PAGES.PROJECT.GRANT(project.details?.slug || project.uid || "", grant.uid)}
      className={cn(
        "flex items-center gap-3 p-4 rounded-lg border transition-colors",
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
      )}
      data-testid="grant-card"
    >
      {grant.community?.details?.imageURL && (
        <img
          src={grant.community.details.imageURL}
          alt={grant.community.details.name || "Community"}
          className="h-10 w-10 rounded-full object-cover shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {grant.details?.title || "Untitled Grant"}
          </h3>
          {grant.completed && (
            <CheckCircleIcon className="h-5 w-5 text-green-600 shrink-0" aria-label="Completed" />
          )}
        </div>
        {grant.community?.details?.name && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {grant.community.details.name}
          </p>
        )}
      </div>
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
      <img src="/images/comments.png" alt="" className="h-32 w-auto object-contain opacity-60" />
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
  const router = useRouter();
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
        {grants.map((grant) => (
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
