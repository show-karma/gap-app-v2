"use client";

import { InboxIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import type { IFundingApplication } from "@/types/funding-platform";
import ApplicationDetailView from "../ApplicationView/ApplicationDetailView";
import { ApplicationInboxListItem } from "./ApplicationInboxListItem";

const HASH_PREFIX = "#application-";
const SCROLL_CONTAINER_ID = "application-inbox-list";

/** Read the selected application reference from the URL hash, if present. */
function getReferenceFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const { hash } = window.location;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const ref = decodeURIComponent(hash.slice(HASH_PREFIX.length));
  return ref || null;
}

interface ApplicationInboxProps {
  applications: IFundingApplication[];
  programId: string;
  communityId: string;
  /** Original program id (possibly `programId_chainId`) for building detail routes. */
  combinedProgramId: string;
  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage: () => void;
  total: number;
  onApplicationHover?: (referenceNumber: string) => void;
}

const ListSkeleton = () => (
  <div className="space-y-2.5" aria-hidden="true">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
        key={i}
        className="h-28 w-full animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800"
      />
    ))}
  </div>
);

const DetailEmptyState = ({ message }: { message: string }) => (
  <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
      <InboxIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
    </div>
    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{message}</p>
  </div>
);

const ApplicationInbox: FC<ApplicationInboxProps> = ({
  applications,
  programId,
  communityId,
  combinedProgramId,
  isLoading = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  fetchNextPage,
  total,
  onApplicationHover,
}) => {
  const [selectedRef, setSelectedRef] = useState<string | null>(() => getReferenceFromHash());
  // Tracks the most recent non-empty result set so we can tell when the selected
  // application drops out of the list due to a filter/search/refetch (versus a
  // deep-link to an application that was never in the list).
  const prevRefsRef = useRef<string[] | null>(null);

  const handleSelect = useCallback((referenceNumber: string) => {
    setSelectedRef(referenceNumber);
    // Persist selection in the hash without disturbing existing query params.
    const { pathname, search } = window.location;
    window.history.replaceState(
      null,
      "",
      `${pathname}${search}${HASH_PREFIX}${encodeURIComponent(referenceNumber)}`
    );
  }, []);

  // Sync the selection from the URL hash on mount and on back/forward navigation.
  useEffect(() => {
    const sync = () => setSelectedRef(getReferenceFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Keep the selection consistent with the current result set:
  // - default to the first application when nothing is selected;
  // - when the selected application drops out of the list (filter/search/
  //   refetch), re-point to the first item so the detail follows the list;
  // - when a settled result set is empty, clear the selection so the detail
  //   panel shows the empty state instead of a now-hidden application.
  // A deep-link to an application that was never in the list is preserved.
  useEffect(() => {
    if (applications.length === 0) {
      // Ignore the transient empty state while a new query is loading; only
      // clear once the empty result has settled.
      if (!isLoading && selectedRef) setSelectedRef(null);
      return;
    }

    const currentRefs = applications.map((application) => application.referenceNumber);

    if (!selectedRef) {
      prevRefsRef.current = currentRefs;
      setSelectedRef(currentRefs[0]);
      return;
    }

    const isPresent = currentRefs.includes(selectedRef);
    const wasPresent = prevRefsRef.current?.includes(selectedRef) ?? false;
    prevRefsRef.current = currentRefs;

    if (!isPresent && wasPresent) {
      handleSelect(currentRefs[0]);
    }
  }, [selectedRef, applications, isLoading, handleSelect]);

  const totalLabel = useMemo(() => `${total} ${pluralize("application", total)}`, [total]);

  const showInitialLoading = isLoading && applications.length === 0;
  const showEmpty = !isLoading && applications.length === 0;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
      {/* Left: selectable list of the reviewer's assigned applications */}
      <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Assigned to you</h2>
            {!showEmpty && <span className="text-xs text-gray-400">{totalLabel}</span>}
          </div>
          <p className="mb-3 text-xs text-gray-400 dark:text-zinc-500">
            Select an application to review it on the right.
          </p>

          {showInitialLoading ? (
            <ListSkeleton />
          ) : showEmpty ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center dark:border-zinc-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No applications are assigned to you yet.
              </p>
            </div>
          ) : (
            <div
              id={SCROLL_CONTAINER_ID}
              className="-mr-1 max-h-[calc(100vh-15rem)] overflow-y-auto pr-1"
            >
              <InfiniteScroll
                dataLength={applications.length}
                next={fetchNextPage}
                hasMore={hasNextPage}
                scrollableTarget={SCROLL_CONTAINER_ID}
                loader={
                  isFetchingNextPage ? (
                    <div className="py-3 text-center text-xs text-gray-400">Loading more…</div>
                  ) : null
                }
                className="space-y-2.5"
              >
                {applications.map((application) => (
                  <ApplicationInboxListItem
                    key={application.referenceNumber}
                    application={application}
                    isSelected={application.referenceNumber === selectedRef}
                    onSelect={handleSelect}
                    onHover={onApplicationHover}
                  />
                ))}
              </InfiniteScroll>
            </div>
          )}
        </div>
      </aside>

      {/* Right: full application detail, reused from the standalone detail route */}
      <section className="min-w-0">
        {selectedRef ? (
          <ApplicationDetailView
            key={selectedRef}
            applicationId={selectedRef}
            programId={programId}
            combinedProgramId={combinedProgramId}
            communityId={communityId}
            variant="panel"
          />
        ) : (
          <DetailEmptyState
            message={
              showInitialLoading
                ? "Loading your applications…"
                : "Select an application from the list to review it."
            }
          />
        )}
      </section>
    </div>
  );
};

export default ApplicationInbox;
