"use client";

import { useQueryState } from "nuqs";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button as FilterButton } from "@/components/ui/button";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useAuth } from "@/hooks/useAuth";
import { AccessDenied } from "@/src/components/ui/AccessDenied";
import {
  useIsReviewerType,
  usePermissionContext,
} from "@/src/core/rbac/context/permission-context";
import { ReviewerType } from "@/src/core/rbac/types";
import type {
  InboxKindFilter as InboxKind,
  InboxQueueFilter,
  ReviewerInboxSort,
} from "@/types/funding-platform";
import type { Community } from "@/types/v2/community";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";
import { cn } from "@/utilities/tailwind";
import { isApplicationReason } from "./attentionMeta";
import { CommunityActionItemsView } from "./CommunityActionItemsView";
import { InboxApplicationDetail } from "./InboxApplicationDetail";
import {
  InboxAttentionFilter,
  type InboxStageFilterValue,
  OPEN_NOTES_FILTER,
} from "./InboxAttentionFilter";
import { InboxHeader } from "./InboxHeader";
import { InboxKindFilter } from "./InboxKindFilter";
import { InboxList, type InboxKindFilter as ListKindFilter } from "./InboxList";
import { InboxMilestoneDetail } from "./InboxMilestoneDetail";
import { InboxProgramFilter } from "./InboxProgramFilter";
import { InboxProjectFilter } from "./InboxProjectFilter";
import { InboxSortControl } from "./InboxSortControl";
import { InboxViewChips } from "./InboxViewChips";
import { BUCKET_RANK } from "./statusToBucket";
import type { InboxItem } from "./types";
import { useInboxFeed } from "./useInboxFeed";

const INBOX_PAGE_SIZE = 25;

const HASH_PREFIX = "#review-";

function getSelectedIdFromHash(): string | null {
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  return hash.startsWith(HASH_PREFIX)
    ? decodeURIComponent(hash.slice(HASH_PREFIX.length)) || null
    : null;
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

interface InboxAccess {
  /** Fetch the application review stream. */
  includeApplications: boolean;
  /** Fetch the milestone stream. */
  includeMilestones: boolean;
  /** The caller may see this page at all. */
  isAuthorized: boolean;
  /** Permission resolution is still in flight — render a placeholder. */
  isCheckingPermissions: boolean;
  /**
   * RESOLVED community-admin access. Distinct from a bare `hasAccess`, which is
   * false while the check is in flight — gating the admin UI on the raw flag
   * would flash the reviewer layout in before the admin one.
   */
  isCommunityAdmin: boolean;
}

/**
 * Resolves what this caller may see in the inbox. Extracted from the page
 * component so the tri-state permission logic lives in one place and reads
 * independently of the rendering.
 */
function useInboxAccess(community: Community): InboxAccess {
  const { authenticated, ready } = useAuth();
  const { isLoading: isRbacLoading } = usePermissionContext();
  const { hasAccess, isLoading: isAdminLoading } = useCommunityAdminAccess(community?.uid);
  const isProgramReviewer = useIsReviewerType(ReviewerType.PROGRAM);
  const isMilestoneReviewer = useIsReviewerType(ReviewerType.MILESTONE);

  return {
    includeApplications: hasAccess || isProgramReviewer,
    includeMilestones: hasAccess || isMilestoneReviewer,
    isAuthorized: authenticated && (hasAccess || isProgramReviewer || isMilestoneReviewer),
    isCheckingPermissions: !ready || isRbacLoading || isAdminLoading,
    isCommunityAdmin: hasAccess && !isAdminLoading,
  };
}

export function ReviewerInboxPage({
  community,
  loadingSlot,
  syncSelectionToHash = true,
}: ReviewerInboxPageProps) {
  const communityId = community?.details?.slug || community?.uid || "";
  const {
    includeApplications,
    includeMilestones,
    isAuthorized,
    isCheckingPermissions,
    isCommunityAdmin,
  } = useInboxAccess(community);

  // Community admins get the community-wide milestone queue in the SAME list,
  // with a stage filter. The server decides scope from the authenticated
  // caller — this flag only drives what the page renders, never what it is
  // allowed to see.
  const [attentionFilter, setAttentionFilter] = useState<InboxQueueFilter | null>(null);
  // Admins work the queue as a chase list, so it opens by next follow-up.
  const [inboxSort, setInboxSort] = useState<ReviewerInboxSort>("follow_up_date");
  const [limit, setLimit] = useState(INBOX_PAGE_SIZE);
  const [kindParam, setKindParam] = useQueryState("kind");
  const queueKind: InboxKind | null =
    kindParam === "application" || kindParam === "milestone" ? kindParam : null;
  const [programId, setProgramId] = useQueryState("programId");
  const [projectUid, setProjectUid] = useQueryState("projectUid");
  const [pendingParam, setPendingParam] = useQueryState("pendingActionItems");
  const pendingActionItems = pendingParam === "true";
  const [viewParam, setViewParam] = useQueryState("view");
  const showActionItems = isCommunityAdmin && syncSelectionToHash && viewParam === "actions";

  const { items, stats, isLoading, isFetching, totalCount, error, refetch } = useInboxFeed({
    communityId,
    includeApplications: includeApplications && !showActionItems,
    includeMilestones: includeMilestones && !showActionItems,
    applicationFilters: { limit },
    attention: attentionFilter,
    kind: isCommunityAdmin ? queueKind : null,
    programId,
    projectUid,
    pendingActionItems,
    inboxSort,
  });

  const hasBothRoles = includeApplications && includeMilestones;

  // Selection synced to the URL hash so detail views are shareable / survive
  // back-forward — unless the host owns the hash (see syncSelectionToHash).
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    syncSelectionToHash ? getSelectedIdFromHash() : null
  );
  const [kindFilter, setKindFilter] = useState<ListKindFilter>("all");
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  /** A filter change asked for the first item of the incoming list. */
  const autoSelectPending = useRef(false);
  const detailRef = useRef<HTMLElement>(null);

  /**
   * Mirrors a selection into the URL hash. `replace` forces a history replace
   * instead of a push — used for selections the user did not click (the
   * auto-selection after a filter change), so the browser Back button still
   * leaves the page rather than stepping back through selections.
   */
  const selectItem = useCallback(
    (id: string, options?: { replace?: boolean }) => {
      if (syncSelectionToHash) {
        const url = new URL(window.location.href);
        url.hash = `${HASH_PREFIX}${encodeURIComponent(id)}`;
        // Opening a detail from the list (no prior selection) pushes a history
        // entry so the browser Back button returns to the list — the hashchange
        // listener below clears the selection — instead of navigating off the
        // page entirely. Switching between items replaces the entry so we don't
        // spam the history stack. pushState runs in a click handler (not a
        // useEffect), so it never dispatches an App Router navigation (#1547).
        const replace = options?.replace ?? selectedIdRef.current != null;
        if (replace) {
          window.history.replaceState({}, "", url.toString());
        } else {
          window.history.pushState({}, "", url.toString());
        }
      }
      setSelectedId(id);
    },
    [syncSelectionToHash]
  );

  const handleSelect = useCallback(
    (id: string) => {
      selectItem(id);
      // Below the two-column breakpoint the detail sits under the whole list.
      if (!window.matchMedia("(min-width: 1280px)").matches) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        requestAnimationFrame(() => {
          const detail = detailRef.current;
          if (detail && typeof detail.scrollIntoView === "function") {
            detail.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
          }
        });
      }
    },
    [selectItem]
  );

  // A stage filter or sort change both yield a new page-one list: drop a
  // selection the new list may no longer contain, so the URL hash never points
  // at a hidden item.
  const resetToNewList = useCallback(() => {
    setLimit(INBOX_PAGE_SIZE);
    autoSelectPending.current = true;
    if (selectedIdRef.current == null) return;
    if (syncSelectionToHash) {
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState({}, "", url.toString());
    }
    setSelectedId(null);
  }, [syncSelectionToHash]);

  // "Has open notes" lives in the stage menu but is a different server
  // parameter, so the menu's value is derived from both pieces of state.
  const stageFilterValue: InboxStageFilterValue | null = pendingActionItems
    ? OPEN_NOTES_FILTER
    : attentionFilter;

  const handleAttentionChange = useCallback(
    (value: InboxStageFilterValue | null) => {
      if (value === OPEN_NOTES_FILTER) {
        setAttentionFilter(null);
        void setPendingParam("true");
      } else {
        setAttentionFilter(value);
        void setPendingParam(null);
      }
      resetToNewList();
    },
    [resetToNewList, setPendingParam]
  );

  // Switching stream drops a stage filter that belongs to the other stream, so
  // "Applications" never shows an empty list filtered to a milestone stage.
  const handleKindChange = useCallback(
    (value: InboxKind | null) => {
      void setKindParam(value);
      setAttentionFilter((current) => {
        if (current === null || value === null || current === "followup_due") return current;
        const currentKind: InboxKind = isApplicationReason(current) ? "application" : "milestone";
        return currentKind === value ? current : null;
      });
      resetToNewList();
    },
    [setKindParam, resetToNewList]
  );

  const handleProgramChange = useCallback(
    (value: string | null) => {
      void setProgramId(value);
      void setProjectUid(null);
      setAttentionFilter(null);
      resetToNewList();
    },
    [setProgramId, setProjectUid, resetToNewList]
  );

  const handleProjectChange = useCallback(
    (value: string | null) => {
      void setProjectUid(value);
      setAttentionFilter(null);
      resetToNewList();
    },
    [setProjectUid, resetToNewList]
  );

  const handleSortChange = useCallback(
    (value: ReviewerInboxSort) => {
      setInboxSort(value);
      resetToNewList();
    },
    [resetToNewList]
  );

  useEffect(() => {
    if (!syncSelectionToHash) return;
    const sync = () => setSelectedId(getSelectedIdFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [syncSelectionToHash]);

  // Auto-select the first item once the feed loads, so the detail pane isn't
  // stuck on the "select an item" placeholder. Picks the first item in the
  // currently visible (kind-filtered) list, ordered the same way InboxList
  // groups them — by bucket rank, then feed order within a bucket.
  //
  // ONLY in the embedded dashboard drill-in (syncSelectionToHash === false).
  // On the standalone action-items page the URL hash drives selection AND its
  // history (pushState on the first selection so browser Back returns to the
  // list); auto-selecting there would make that first selection a "switch"
  // (replaceState) and Back would eject off-page. Selection there stays
  // hash-driven, so a fresh load shows the list until the user picks an item.
  //
  // Runs once: after the selection is later cleared, this must NOT jump back
  // into a detail, or the surrounding Back gesture would be inert.
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    // Embedded drill-in: auto-select once, on first load.
    // Standalone page: only after a filter change, which queues the flag above.
    // A fresh load here stays hash-driven so the first CLICK pushes a history
    // entry and Back returns to the list instead of ejecting off-page.
    const allowed = syncSelectionToHash ? autoSelectPending.current : !hasAutoSelected.current;
    if (showActionItems || !allowed || selectedId != null || items.length === 0 || isFetching)
      return;
    const visible = kindFilter === "all" ? items : items.filter((i) => i.kind === kindFilter);
    if (visible.length === 0) return;
    const first = visible.reduce((best, current) =>
      BUCKET_RANK[current.bucket] < BUCKET_RANK[best.bucket] ? current : best
    );
    hasAutoSelected.current = true;
    autoSelectPending.current = false;
    // replace, never push: the reader did not click this.
    selectItem(first.id, { replace: true });
  }, [items, selectedId, kindFilter, syncSelectionToHash, selectItem, isFetching, showActionItems]);

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

  const scopeFilterControls = (
    <>
      <InboxProgramFilter
        communityId={communityId}
        value={programId}
        onChange={handleProgramChange}
      />
      <InboxProjectFilter
        communityId={communityId}
        programId={programId ? normalizeProgramId(programId) : null}
        value={projectUid}
        onChange={handleProjectChange}
        onlyWithActionItems={showActionItems}
      />
    </>
  );

  return (
    <div className="w-full space-y-4">
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-5 gap-y-2",
          isCommunityAdmin &&
            syncSelectionToHash &&
            "border-b border-gray-200 pb-3 dark:border-zinc-700"
        )}
      >
        <InboxHeader
          stats={stats}
          isCommunityAdmin={isCommunityAdmin}
          showQueueSummary={!showActionItems}
        />
        {isCommunityAdmin && syncSelectionToHash && (
          <div className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-zinc-800">
            <FilterButton
              type="button"
              size="chip"
              aria-pressed={!showActionItems}
              variant="ghost"
              className={cn(
                "font-medium",
                !showActionItems
                  ? "bg-white text-gray-950 shadow-sm hover:bg-white dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-900"
                  : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-zinc-700"
              )}
              onClick={() => void setViewParam(null)}
            >
              Queue
            </FilterButton>
            <FilterButton
              type="button"
              size="chip"
              aria-pressed={showActionItems}
              variant="ghost"
              className={cn(
                "font-medium",
                showActionItems
                  ? "bg-white text-gray-950 shadow-sm hover:bg-white dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-900"
                  : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-zinc-700"
              )}
              onClick={() => void setViewParam("actions")}
            >
              Action items
            </FilterButton>
          </div>
        )}
      </div>

      {isCommunityAdmin && !showActionItems && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 pb-3 dark:border-zinc-700">
          <InboxViewChips
            stats={stats}
            value={pendingActionItems ? null : attentionFilter}
            onChange={handleAttentionChange}
          />
          <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
            <InboxKindFilter stats={stats} value={queueKind} onChange={handleKindChange} />
            <InboxAttentionFilter
              stats={stats}
              value={stageFilterValue}
              onChange={handleAttentionChange}
              kind={queueKind}
            />
            {scopeFilterControls}
            <InboxSortControl value={inboxSort} onChange={handleSortChange} />
          </div>
        </div>
      )}

      {showActionItems ? (
        <CommunityActionItemsView
          communityId={communityId}
          programId={programId}
          projectUid={projectUid}
          active={showActionItems}
          scopeFilters={
            <div className="flex flex-wrap items-center gap-2">{scopeFilterControls}</div>
          }
        />
      ) : error ? (
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
          <aside className="min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto">
            {isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 dark:border-zinc-700 dark:bg-zinc-900">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
                <p className="text-gray-500 dark:text-gray-400">
                  {isCommunityAdmin
                    ? pendingActionItems
                      ? "Nothing with open action items matches these filters."
                      : "Nothing needs attention right now."
                    : "Nothing assigned to you yet. New reviews will appear here."}
                </p>
              </div>
            ) : (
              <div
                className={cn("relative", isFetching && "pointer-events-none")}
                aria-busy={isFetching}
              >
                {isFetching && (
                  <output className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 rounded-t-2xl bg-white/90 py-2 text-xs font-medium text-gray-600 dark:bg-zinc-900/90 dark:text-gray-300">
                    <Spinner aria-hidden className="h-4 w-4 border-2" />
                    Updating list…
                  </output>
                )}
                <div
                  className={cn(
                    "transition-opacity motion-reduce:transition-none",
                    isFetching && "opacity-40"
                  )}
                >
                  <InboxList
                    items={items}
                    selectedId={selectedId ?? undefined}
                    onSelect={handleSelect}
                    hasBothRoles={hasBothRoles}
                    isCommunityAdmin={isCommunityAdmin}
                    kindFilter={kindFilter}
                    onKindFilterChange={setKindFilter}
                    totalCount={totalCount}
                    sort={inboxSort}
                  />
                </div>
                {totalCount != null && totalCount > items.length && (
                  <Button
                    variant="secondary"
                    className="mt-3 w-full"
                    onClick={() => setLimit((current) => current + INBOX_PAGE_SIZE)}
                    disabled={isFetching}
                  >
                    Show {Math.min(INBOX_PAGE_SIZE, totalCount - items.length)} more (
                    {totalCount - items.length} remaining)
                  </Button>
                )}
              </div>
            )}
          </aside>

          <section ref={detailRef} className="min-w-0 scroll-mt-4">
            <InboxDetailPane
              item={selectedItem}
              communityId={communityId}
              isCommunityAdmin={isCommunityAdmin}
            />
          </section>
        </div>
      )}
    </div>
  );
}

interface InboxDetailPaneProps {
  item: InboxItem | undefined;
  communityId: string;
  isCommunityAdmin: boolean;
}

function InboxDetailPane({ item, communityId, isCommunityAdmin }: InboxDetailPaneProps) {
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
    return (
      <InboxApplicationDetail
        key={item.id}
        item={item}
        communityId={communityId}
        showAdminTools={isCommunityAdmin}
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
        showAdminTools={isCommunityAdmin}
        attentionReason={
          item.attentionReason && !isApplicationReason(item.attentionReason)
            ? item.attentionReason
            : undefined
        }
        stageAgeDays={item.stageAgeDays}
        nextFollowUpAt={item.nextFollowUpAt}
        projectUid={item.projectUid}
        programId={item.programId}
        grantUid={item.grantUid}
        projectSlug={item.projectSlug}
        projectTitle={item.project}
        programName={item.subtitle}
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
