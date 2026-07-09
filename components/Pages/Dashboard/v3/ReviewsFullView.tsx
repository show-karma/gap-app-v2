"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { DashboardAdminCommunity } from "@/hooks/useDashboardAdmin";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { EmptyState } from "./primitives";
import { ReviewsInboxSkeleton } from "./ReviewsInboxSkeleton";
import { deriveReviewerCommunities, type ReviewerCommunity } from "./reviewCommunities";

/**
 * The reviewer inbox drill-in reuses the exact same component that powers
 * `/community/[id]/manage/action-items` — the unified applications + milestone
 * verification inbox. It is heavy (pulls the full application/milestone detail
 * views), so it is code-split with `dynamic()` and only loaded when the "My
 * reviews" tile is opened.
 */
const ReviewerInboxPage = dynamic(
  () => import("@/components/Inbox/ReviewerInboxPage").then((mod) => mod.ReviewerInboxPage),
  { ssr: false, loading: () => <ReviewsInboxSkeleton /> }
);

/**
 * "My reviews" drill-in. A reviewer may hold reviewer roles across several
 * communities, but the inbox endpoint (and its RBAC context) is scoped to one
 * community at a time — so we derive the distinct communities from the
 * reviewer's programs and render the shared `ReviewerInboxPage` for the active
 * one, wrapped in a community-scoped `PermissionProvider` so the reviewer's
 * per-community roles (and the approve/reject/verify actions) resolve. A pill
 * switcher appears only when more than one community is in play.
 */
export function ReviewsFullView({
  programs,
  adminCommunities = [],
}: {
  programs: FundingProgram[];
  adminCommunities?: DashboardAdminCommunity[];
}) {
  const communities = useMemo<ReviewerCommunity[]>(
    () => deriveReviewerCommunities(programs, adminCommunities),
    [programs, adminCommunities]
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = communities.find((entry) => entry.id === activeId) ?? communities[0];

  if (!active) {
    return (
      <section className="scroll-mt-5" id="reviews">
        <EmptyState
          icon="eye"
          title="No reviews assigned yet"
          body="You don't have reviewer permissions for any programs yet. Community admins can assign you as a reviewer for their funding programs."
          secondary={{ label: "Browse communities", icon: "users", href: PAGES.COMMUNITIES }}
        />
      </section>
    );
  }

  return (
    <section className="flex scroll-mt-5 flex-col gap-4" id="reviews">
      {communities.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {communities.map((entry) => {
            const isActive = entry.id === active.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setActiveId(entry.id)}
                aria-pressed={isActive}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  isActive
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/[.14] dark:text-brand-300"
                    : "border-sf-line-strong bg-sf-card text-sf-heading hover:bg-sf-elev"
                )}
              >
                {entry.community.details.name}
              </button>
            );
          })}
        </div>
      ) : null}

      <PermissionProvider key={active.id} resourceContext={{ communityId: active.id }}>
        <ReviewerInboxPage community={active.community} loadingSlot={<ReviewsInboxSkeleton />} />
      </PermissionProvider>
    </section>
  );
}
