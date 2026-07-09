"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { DashboardAdminCommunity } from "@/hooks/useDashboardAdmin";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { EmptyState, SkeletonList } from "./primitives";

/**
 * The reviewer inbox drill-in reuses the exact same component that powers
 * `/community/[id]/manage/action-items` — the unified applications + milestone
 * verification inbox. It is heavy (pulls the full application/milestone detail
 * views), so it is code-split with `dynamic()` and only loaded when the "My
 * reviews" tile is opened.
 */
const ReviewerInboxPage = dynamic(
  () => import("@/components/Inbox/ReviewerInboxPage").then((mod) => mod.ReviewerInboxPage),
  { ssr: false, loading: () => <SkeletonList count={4} /> }
);

interface ReviewerCommunity {
  /** Slug (preferred) or UID — the identifier RBAC + the inbox endpoint key on. */
  id: string;
  community: Community;
}

/** Build the minimal `Community` shape `ReviewerInboxPage` reads from a program. */
function toCommunity(program: FundingProgram): Community {
  return {
    uid: (program.communityUID ?? "") as `0x${string}`,
    chainID: program.chainID,
    details: {
      name: program.communityName ?? program.communitySlug ?? "Community",
      slug: program.communitySlug ?? program.communityUID ?? "",
      logoUrl: program.communityImage,
    },
  };
}

/** Build the `Community` shape `ReviewerInboxPage` reads from an admin community. */
function adminToCommunity(admin: DashboardAdminCommunity): Community {
  return {
    uid: admin.uid as `0x${string}`,
    chainID: admin.chainID,
    details: { name: admin.name, slug: admin.slug, logoUrl: admin.logoUrl },
  };
}

/**
 * Derive the distinct communities a user can review in — from reviewer-role
 * programs plus admin/owner communities with pending applications. A community
 * can surface under either its slug or its uid, so each is claimed against a
 * shared seen-set: whichever source hits it first wins, and it's never listed
 * twice.
 */
function deriveReviewerCommunities(
  programs: FundingProgram[],
  adminCommunities: DashboardAdminCommunity[]
): ReviewerCommunity[] {
  const map = new Map<string, Community>();
  const seen = new Set<string>();
  const claim = (community: Community, ...ids: Array<string | undefined | null>) => {
    const key = ids.find((id): id is string => !!id);
    if (!key) return;
    if (ids.some((id) => id && seen.has(id.toLowerCase()))) return;
    for (const id of ids) if (id) seen.add(id.toLowerCase());
    map.set(key, community);
  };

  for (const program of programs) {
    claim(toCommunity(program), program.communitySlug, program.communityUID);
  }
  // Community admins/owners can review applications in their own communities
  // even without an explicit reviewer-role program.
  for (const admin of adminCommunities) {
    if (admin.pendingApplicationsCount <= 0) continue;
    claim(adminToCommunity(admin), admin.slug, admin.uid);
  }
  return Array.from(map, ([id, community]) => ({ id, community }));
}

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
        <ReviewerInboxPage community={active.community} />
      </PermissionProvider>
    </section>
  );
}
