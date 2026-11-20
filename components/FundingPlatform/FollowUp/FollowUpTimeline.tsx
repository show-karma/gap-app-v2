"use client";

import { format, isToday, isYesterday } from "date-fns";
import { memo } from "react";
import { Button as UiButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFollowUpCase } from "@/hooks/useFollowUpCases";
import type { FollowUpLogEntry } from "@/services/followUpAgent.service";
import { cn } from "@/utilities/tailwind";
import { presentKind, stageLabel, TONE_CLASSES } from "./followUpPresentation";

interface CollapsedEntry {
  readonly entry: FollowUpLogEntry;
  readonly count: number;
}

interface DayGroup {
  readonly day: string;
  readonly entries: CollapsedEntry[];
}

function dayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d");
}

export function groupByDay(log: FollowUpLogEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const entry of log) {
    const label = dayLabel(new Date(entry.at));
    const last = groups[groups.length - 1];
    if (!last || last.day !== label) {
      groups.push({ day: label, entries: [{ entry, count: 1 }] });
      continue;
    }
    const previous = last.entries[last.entries.length - 1];
    if (previous.entry.kind === entry.kind && previous.entry.text === entry.text) {
      last.entries[last.entries.length - 1] = { entry: previous.entry, count: previous.count + 1 };
    } else {
      last.entries.push({ entry, count: 1 });
    }
  }
  return groups;
}

const TimelineEntry = memo(function TimelineEntry({
  entry,
  count,
}: {
  entry: FollowUpLogEntry;
  count: number;
}) {
  const { label, Icon, tone } = presentKind(entry.kind);
  const classes = TONE_CLASSES[tone];
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <span
        className={cn(
          "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          classes.dot
        )}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-xs font-semibold uppercase tracking-wide", classes.label)}>
            {label}
          </span>
          <time className="text-xs text-muted-foreground" dateTime={entry.at}>
            {format(new Date(entry.at), "HH:mm")}
          </time>
          {count > 1 ? (
            <span className="rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
              ×{count}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-foreground">{entry.text}</p>
      </div>
    </li>
  );
});

interface FollowUpTimelineProps {
  readonly programId: string;
  readonly milestoneUid: string;
}

export function FollowUpTimeline({ programId, milestoneUid }: FollowUpTimelineProps) {
  const { data, isLoading, isError, refetch } = useFollowUpCase(programId, milestoneUid);

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">We couldn&apos;t load this activity.</p>
        <UiButton variant="outline" className="mt-3" onClick={() => refetch()}>
          Try again
        </UiButton>
      </div>
    );
  }

  if (!data || data.log.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No activity for this milestone yet.
      </div>
    );
  }

  const closed = Boolean(data.closedAt);
  return (
    <section aria-label="Follow-up activity" className="min-w-0">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-foreground">
            {data.milestoneTitle || "Untitled milestone"}
          </h2>
          {data.referenceNumber ? (
            <p className="text-sm text-muted-foreground">{data.referenceNumber}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            data.needsOperator
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
              : "bg-muted text-muted-foreground"
          )}
        >
          {stageLabel(data.stage, closed)}
        </span>
      </header>
      {data.needsOperator ? (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
          The assistant asked you something on Slack. Reply there and it picks up from your answer.
        </div>
      ) : null}
      <div className="space-y-6">
        {groupByDay(data.log).map((group) => (
          <div key={group.day}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.day}
            </h3>
            <ol className="relative before:absolute before:left-3.5 before:top-1 before:bottom-1 before:w-px before:bg-border">
              {group.entries.map(({ entry, count }, index) => (
                <TimelineEntry key={`${entry.at}-${index}`} entry={entry} count={count} />
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
