"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useAuth } from "@/hooks/useAuth";
import { AccessDenied } from "@/src/components/ui/AccessDenied";
import {
  useIsReviewerType,
  usePermissionContext,
} from "@/src/core/rbac/context/permission-context";
import { ReviewerType } from "@/src/core/rbac/types";
import type { Community } from "@/types/v2/community";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";
import ApplicationDetailView from "../FundingPlatform/ApplicationView/ApplicationDetailView";
import { InboxHeader } from "./InboxHeader";
import { type InboxKindFilter, InboxList } from "./InboxList";
import { InboxMilestoneDetail } from "./InboxMilestoneDetail";
import type { InboxItem } from "./types";
import { useInboxFeed } from "./useInboxFeed";

const HASH_PREFIX = "#review-";

function getSelectedIdFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const { hash } = window.location;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  return decodeURIComponent(hash.slice(HASH_PREFIX.length)) || null;
}

interface ReviewerInboxPageProps {
  community: Community;
  /**
   * Optional placeholder shown while permissions resolve, in place of the
   * default centered spinner. Lets a host (e.g. the dashboard drill-in) supply
   * a themed skeleton so the loading state doesn't jump.
   */
  loadingSlot?: ReactNode;
  /**
   * Mirror the selected item into the URL hash (`#review-<id>`) for deep links.
   * Disable when embedded in a host that already owns the hash — e.g. the
   * dashboard drill-in, which navigates via `#reviews`; two writers of the same
   * hash collide (selection resets, back-to-overview breaks). Off → selection is
   * pure component state.
   */
  syncSelectionToHash?: boolean;
}

export function ReviewerInboxPage({
  community,
  loadingSlot,
  syncSelectionToHash = true,
}: ReviewerInboxPageProps) {
  const communityId = community?.details?.slug || community?.uid || "";
  const { authenticated, ready } = useAuth();
  const { isLoading: isRbacLoading } = usePermissionContext();
  const { hasAccess, isLoading: isAdminLoading } = useCommunityAdminAccess(community?.uid);
  const isProgramReviewer = useIsReviewerType(ReviewerType.PROGRAM);
  const isMilestoneReviewer = useIsReviewerType(ReviewerType.MILESTONE);

  const includeApplications = hasAccess || isProgramReviewer;
  const includeMilestones = hasAccess || isMilestoneReviewer;
  const isAuthorized = authenticated && (hasAccess || isProgramReviewer || isMilestoneReviewer);

  const isCheckingPermissions = !ready || isRbacLoading || isAdminLoading;

  const { items, stats, isLoading, error, refetch } = useInboxFeed({
    communityId,
    includeApplications,
    includeMilestones,
  });

  const hasBothRoles = includeApplications && includeMilestones;

  // Selection synced to the URL hash so detail views are shareable / survive
  // back-forward — unless the host owns the hash (see syncSelectionToHash).
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    syncSelectionToHash ? getSelectedIdFromHash() : null
  );
  const [kindFilter, setKindFilter] = useState<InboxKindFilter>("all");

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (!syncSelectionToHash) return;
      const url = new URL(window.location.href);
      url.hash = `${HASH_PREFIX}${encodeURIComponent(id)}`;
      window.history.replaceState({}, "", url.toString());
    },
    [syncSelectionToHash]
  );

  useEffect(() => {
    if (!syncSelectionToHash) return;
    const sync = () => setSelectedId(getSelectedIdFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [syncSelectionToHash]);

  const selectedItem: InboxItem | undefined = useMemo(
    () => items.find((i) => i.id === selectedId),
    [items, selectedId]
  );

  if (isCheckingPermissions) {
    if (loadingSlot) return <>{loadingSlot}</>;
    return (
      <div className="flex w-full items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <AccessDenied
        title="No reviewer access"
        message="Action Items are available to application and milestone reviewers for this community."
        communityName={community?.details?.name}
      />
    );
  }

  return (
    <div className="w-full space-y-6">
      <InboxHeader stats={stats} />

      {error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-gray-600 dark:text-gray-400">
            There was an error loading your action items. Please try again.
          </p>
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
          <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
            {isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 dark:border-zinc-700 dark:bg-zinc-900">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
                <p className="text-gray-500 dark:text-gray-400">
                  Nothing assigned to you yet. New reviews will appear here.
                </p>
              </div>
            ) : (
              <InboxList
                items={items}
                selectedId={selectedId ?? undefined}
                onSelect={handleSelect}
                hasBothRoles={hasBothRoles}
                kindFilter={kindFilter}
                onKindFilterChange={setKindFilter}
              />
            )}
          </aside>

          <section className="min-w-0">
            <InboxDetailPane item={selectedItem} communityId={communityId} />
          </section>
        </div>
      )}
    </div>
  );
}

interface InboxDetailPaneProps {
  item: InboxItem | undefined;
  communityId: string;
}

function InboxDetailPane({ item, communityId }: InboxDetailPaneProps) {
  if (!item) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
        <p className="text-gray-500 dark:text-gray-400">
          Select an item on the left to start reviewing.
        </p>
      </div>
    );
  }

  if (item.kind === "application") {
    if (!item.programId) {
      return (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
          <p className="text-gray-500 dark:text-gray-400">
            This application can&apos;t be opened here — open it from the program&apos;s
            applications view.
          </p>
        </div>
      );
    }
    const rawProgramId = item.programId;
    const programId = normalizeProgramId(rawProgramId);
    const combinedProgramId = rawProgramId.includes("_")
      ? rawProgramId
      : item.chainID
        ? `${rawProgramId}_${item.chainID}`
        : rawProgramId;
    return (
      <ApplicationDetailView
        key={item.id}
        applicationId={item.referenceNumber || item.id}
        programId={programId}
        combinedProgramId={combinedProgramId}
        communityId={communityId}
        variant="panel"
      />
    );
  }

  if (item.kind === "milestone") {
    if (!item.programId || !item.projectUid || !item.milestoneUid) {
      return (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
          <p className="text-gray-500 dark:text-gray-400">
            This milestone can&apos;t be opened here — open it from the program&apos;s milestones
            view.
          </p>
        </div>
      );
    }
    return (
      <InboxMilestoneDetail
        key={item.id}
        projectUid={item.projectUid}
        programId={item.programId}
        grantUid={item.grantUid}
        projectSlug={item.projectSlug}
        projectTitle={item.project}
        milestoneUid={item.milestoneUid}
        communityId={communityId}
      />
    );
  }

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
      <p className="text-gray-500 dark:text-gray-400">This item can&apos;t be displayed.</p>
    </div>
  );
}
