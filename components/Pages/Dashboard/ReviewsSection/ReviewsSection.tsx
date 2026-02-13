"use client";

import { AlertTriangle, ArrowRight, Eye } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { PAGES } from "@/utilities/pages";

interface CommunityWithPrograms extends FundingProgram {
  programCount: number;
  totalApplications: number;
  milestoneReviewerPrograms: Array<{ programId: string; chainID: number }>;
}

function useCommunitiesWithPrograms(programs: FundingProgram[]) {
  return useMemo(() => {
    if (!programs || programs.length === 0) return [];

    const communityMap = new Map<string, CommunityWithPrograms>();

    for (const program of programs) {
      const communityId = program.communitySlug || program.communityUID || "";
      if (!communityId) continue;

      if (!communityMap.has(communityId)) {
        communityMap.set(communityId, {
          ...program,
          communityUID: communityId,
          programCount: 0,
          totalApplications: 0,
          milestoneReviewerPrograms: [],
        });
      }

      const community = communityMap.get(communityId)!;
      community.programCount += 1;
      community.totalApplications += program.metrics?.totalApplications || 0;

      if (program.isMilestoneReviewer) {
        community.milestoneReviewerPrograms.push({
          programId: program.programId,
          chainID: program.chainID,
        });
      }
    }

    return Array.from(communityMap.values()).sort((a, b) =>
      (a.communityName ?? "").localeCompare(b.communityName ?? "")
    );
  }, [programs]);
}

function ReviewsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={`review-skeleton-${i}`}
          className="animate-pulse rounded-xl border border-border p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
          </div>
          <div className="h-9 w-full rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ReviewsSectionContent({
  communities,
  programCount,
}: {
  communities: CommunityWithPrograms[];
  programCount: number;
}) {
  if (communities.length === 0) {
    return (
      <div className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
        You don&apos;t have reviewer permissions for any programs yet. Community admins can assign
        you as a reviewer for their funding programs.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="text-sm text-blue-600 dark:text-blue-400">Communities</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {communities.length}
          </p>
        </div>
        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
          <p className="text-sm text-green-600 dark:text-green-400">Total Programs</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{programCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {communities.map((community) => {
          const slug = community.communitySlug || community.communityUID || "";
          const displayName = community.communityName ?? slug;
          return (
            <div
              key={slug}
              className="rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
            >
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <ProfilePicture
                    imageURL={community.communityImage}
                    name={displayName}
                    size="48"
                    className="h-12 w-12 min-h-12 min-w-12 border border-border"
                    alt={displayName}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{displayName}</h3>
                    <p className="text-sm text-muted-foreground">Community</p>
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Programs</span>
                    <span className="font-medium text-foreground">{community.programCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Applications</span>
                    <span className="font-medium text-foreground">
                      {community.totalApplications}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    href={PAGES.REVIEWER.DASHBOARD(slug)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    View Programs
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  {community.milestoneReviewerPrograms.length > 0 ? (
                    <Link
                      href={`${PAGES.ADMIN.MILESTONES(slug)}?programIds=${community.milestoneReviewerPrograms.map((p) => p.programId).join(",")}`}
                      className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <Eye className="h-4 w-4" />
                      View Milestones
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function ReviewsSection() {
  const { programs, isLoading, error, refetch } = useReviewerPrograms();
  const communities = useCommunitiesWithPrograms(programs);

  return (
    <section id="reviews" className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-foreground">My Reviews</h2>

      {isLoading ? (
        <ReviewsSkeleton />
      ) : error ? (
        <div className="flex items-center gap-3 rounded-xl border border-border p-6">
          <AlertTriangle className="h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="flex-1 text-sm text-muted-foreground">
            Unable to load your reviewer programs.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      ) : (
        <ReviewsSectionContent communities={communities} programCount={programs?.length ?? 0} />
      )}
    </section>
  );
}
