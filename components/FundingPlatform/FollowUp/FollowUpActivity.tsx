"use client";

import { useQueryState } from "nuqs";
import pluralize from "pluralize";
import { useCallback, useMemo } from "react";
import { Button as UiButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFollowUpCases } from "@/hooks/useFollowUpCases";
import type { FollowUpCaseSummary } from "@/services/followUpAgent.service";
import { cn } from "@/utilities/tailwind";
import { FollowUpCaseRow } from "./FollowUpCaseRow";
import { FollowUpTimeline } from "./FollowUpTimeline";
import { FOLLOW_UP_VIEWS, type FollowUpView } from "./followUpPresentation";

const isView = (value: string | null): value is FollowUpView =>
  FOLLOW_UP_VIEWS.some((view) => view.value === value);

function matchesView(item: FollowUpCaseSummary, view: FollowUpView): boolean {
  if (view === "attention") return item.needsOperator;
  if (view === "active") return !item.closedAt;
  if (view === "closed") return Boolean(item.closedAt);
  return true;
}

interface FollowUpActivityProps {
  readonly programId: string;
}

export function FollowUpActivity({ programId }: FollowUpActivityProps) {
  const [viewRaw, setView] = useQueryState("view", { defaultValue: "all", clearOnDefault: true });
  const [selected, setSelected] = useQueryState("case");
  const [pageRaw, setPage] = useQueryState("page", { defaultValue: "1", clearOnDefault: true });
  const view: FollowUpView = isView(viewRaw) ? viewRaw : "all";
  const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);

  const { data, isLoading, isError, refetch } = useFollowUpCases(programId, page);
  const items = useMemo(
    () => (data?.items ?? []).filter((item) => matchesView(item, view)),
    [data, view]
  );
  const attentionCount = useMemo(
    () => (data?.items ?? []).filter((item) => item.needsOperator).length,
    [data]
  );
  const activeId = selected ?? items[0]?.milestoneUid ?? null;
  const onSelect = useCallback(
    (milestoneUid: string) => void setSelected(milestoneUid),
    [setSelected]
  );

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]" aria-busy="true">
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load the follow-up activity.
        </p>
        <UiButton variant="outline" className="mt-3" onClick={() => refetch()}>
          Try again
        </UiButton>
      </div>
    );
  }

  if (data?.forbidden) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
        Only program admins can see the follow-up activity.
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="font-medium text-foreground">No follow-ups yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Once the follow-up agent is on for this program, each completed milestone shows up here
          with every step the assistant took.
        </p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div className="space-y-4">
      {attentionCount > 0 ? (
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Waiting on your answer: {pluralize("milestone", attentionCount, true)}
        </p>
      ) : null}
      <fieldset className="m-0 flex flex-wrap gap-1 border-0 p-0">
        <legend className="sr-only">Filter follow-ups</legend>
        {FOLLOW_UP_VIEWS.map((option) => (
          <UiButton
            key={option.value}
            aria-pressed={view === option.value}
            variant="ghost"
            size="sm"
            onClick={() => void setView(option.value)}
            className={cn(view === option.value && "bg-accent text-accent-foreground")}
          >
            {option.label}
          </UiButton>
        ))}
      </fieldset>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-1">
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nothing in this view.
            </p>
          ) : (
            items.map((item) => (
              <FollowUpCaseRow
                key={item.milestoneUid}
                item={item}
                selected={item.milestoneUid === activeId}
                onSelect={onSelect}
              />
            ))
          )}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
              <UiButton
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => void setPage(String(page - 1))}
              >
                Previous
              </UiButton>
              <span>
                Page {page} of {totalPages}
              </span>
              <UiButton
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => void setPage(String(page + 1))}
              >
                Next
              </UiButton>
            </div>
          ) : null}
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-5">
          {activeId ? (
            <FollowUpTimeline programId={programId} milestoneUid={activeId} />
          ) : (
            <p className="text-sm text-muted-foreground">Pick a milestone to see what happened.</p>
          )}
        </div>
      </div>
    </div>
  );
}
