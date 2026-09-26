"use client";

import { CalendarDaysIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { memo, type ReactNode, useCallback, useRef, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button as UiButton } from "@/components/ui/button";
import { useCommunityActionItems } from "@/hooks/useCommunityActionItems";
import type { CommunityActionItemFilters } from "@/services/milestoneActionItemsService";
import type { ICommunityActionItem } from "@/types/funding-platform";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import { InboxMilestoneDetail } from "./InboxMilestoneDetail";

interface Props {
  communityId: string;
  programId: string | null;
  projectUid: string | null;
  active: boolean;
  scopeFilters?: ReactNode;
}

const STATUSES = ["all", "pending", "completed"] as const;

const ActionItemRow = memo(function ActionItemRow({
  item,
  selected,
  onSelect,
}: {
  item: ICommunityActionItem;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <li>
      <UiButton
        type="button"
        variant="ghost"
        onClick={() => onSelect(item.id)}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "group h-auto w-full min-w-0 flex-col items-stretch gap-1 rounded-none px-4 py-3 text-left whitespace-normal focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500",
          selected
            ? "bg-gray-100 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-800"
            : "hover:bg-gray-50 dark:hover:bg-zinc-800/60"
        )}
      >
        <span className="flex items-start gap-2">
          <span className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
            {item.content}
          </span>
          <ChevronRightIcon
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform motion-reduce:transition-none group-hover:translate-x-0.5",
              selected && "text-gray-700 dark:text-gray-200"
            )}
            aria-hidden="true"
          />
        </span>
        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
          {item.projectTitle ?? item.projectUid ?? "Unknown project"} ·{" "}
          {item.milestoneTitle ?? "Milestone"}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span
            className={cn(
              "font-medium",
              item.completedAt
                ? "text-green-700 dark:text-green-400"
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            {item.completedAt ? "Completed" : "Pending"}
          </span>
          {item.followUpAt && !item.completedAt && (
            <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <CalendarDaysIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Follow up {formatDate(item.followUpAt, "UTC")}
            </span>
          )}
        </span>
      </UiButton>
    </li>
  );
});

function ActionItemListBody({
  query,
  status,
  selectedId,
  onSelect,
}: {
  query: ReturnType<typeof useCommunityActionItems>;
  status: CommunityActionItemFilters["status"];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { data, isLoading, isFetching, error, refetch } = query;
  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="mb-3 text-gray-600 dark:text-gray-300">Action items could not be loaded.</p>
        <Button variant="secondary" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex justify-center rounded-2xl border border-gray-200 bg-white py-16 dark:border-zinc-700 dark:bg-zinc-900">
        <Spinner />
      </div>
    );
  }
  if (!data?.items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-400">
        No {status === "all" ? "" : `${status} `}action items match these filters.
      </div>
    );
  }
  return (
    <div
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      aria-busy={isFetching}
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-zinc-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Action items</h2>
        {data.pagination.total > 0 && (
          <span className="text-xs tabular-nums text-gray-500 dark:text-zinc-400">
            {data.pagination.total} {pluralize("item", data.pagination.total)}
          </span>
        )}
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
        {data.items.map((item) => (
          <ActionItemRow
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
}

export function CommunityActionItemsView({
  communityId,
  programId,
  projectUid,
  active,
  scopeFilters,
}: Props) {
  const [status, setStatus] = useState<CommunityActionItemFilters["status"]>("all");
  const [pageState, setPageState] = useState({ page: 1, programId, projectUid });
  const page =
    pageState.programId === programId && pageState.projectUid === projectUid ? pageState.page : 1;
  const changePage = (nextPage: number) => setPageState({ page: nextPage, programId, projectUid });
  const filters = { page, status, programId, projectUid };
  const query = useCommunityActionItems(communityId, filters, active);
  const items = query.data?.items ?? [];
  const pagination = query.data?.pagination;
  const selectionScope = `${communityId}:${programId ?? ""}:${projectUid ?? ""}:${status}:${page}`;
  const [selection, setSelection] = useState<{ id: string; scope: string } | null>(null);
  const selectedId = selection?.scope === selectionScope ? selection.id : null;
  const selectedItem = items.find((item) => item.id === selectedId);
  const detailRef = useRef<HTMLElement>(null);

  const selectItem = useCallback(
    (id: string) => {
      setSelection({ id, scope: selectionScope });
      if (window.matchMedia("(min-width: 1280px)").matches) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView?.({
          block: "start",
          behavior: reduceMotion ? "auto" : "smooth",
        });
      });
    },
    [selectionScope]
  );

  return (
    <section className="space-y-4" aria-label="Action items">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUSES.map((option) => (
            <UiButton
              key={option}
              type="button"
              variant={status === option ? "secondary" : "outline"}
              size="chip"
              aria-pressed={status === option}
              onClick={() => {
                setStatus(option);
                changePage(1);
              }}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </UiButton>
          ))}
        </div>
        {scopeFilters}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
        <aside className="min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto">
          <ActionItemListBody
            query={query}
            status={status}
            selectedId={selectedId}
            onSelect={selectItem}
          />

          {pagination && pagination.totalPages > 1 && (
            <nav
              className="mt-3 flex items-center justify-between gap-3 text-sm"
              aria-label="Action item pages"
            >
              <Button
                variant="secondary"
                disabled={page <= 1 || query.isFetching}
                onClick={() => changePage(page - 1)}
              >
                Previous
              </Button>
              <span>
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= pagination.totalPages || query.isFetching}
                onClick={() => changePage(page + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </aside>

        <section ref={detailRef} className="min-w-0 scroll-mt-4" aria-label="Selected milestone">
          {selectedItem?.projectUid && selectedItem.programId ? (
            <InboxMilestoneDetail
              key={selectedItem.milestoneUID}
              showAdminTools
              projectUid={selectedItem.projectUid}
              programId={selectedItem.programId}
              grantUid={selectedItem.grantUID}
              projectTitle={selectedItem.projectTitle ?? undefined}
              milestoneUid={selectedItem.milestoneUID}
              communityId={communityId}
            />
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
              <p className="text-gray-500 dark:text-gray-400">
                {selectedItem
                  ? "This milestone could not be opened because its project or program is unavailable."
                  : "Select an action item on the left to view its milestone."}
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
