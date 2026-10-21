"use client";

import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import React, { type FC, useMemo, useState } from "react";
import {
  APPLICATION_FILTER_ORDER,
  ATTENTION_META,
  FOLLOW_UP_FILTER,
  FOLLOW_UP_FILTER_LABEL,
  MILESTONE_FILTER_ORDER,
} from "@/components/Inbox/attentionMeta";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type {
  InboxAttentionReason,
  InboxKindFilter,
  InboxQueueFilter,
  IReviewerInboxStats,
} from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

/** Not a stage: "has at least one open follow-up note", served by the same menu. */
export const OPEN_NOTES_FILTER = "open_notes" as const;

export type InboxStageFilterValue = InboxQueueFilter | typeof OPEN_NOTES_FILTER;

interface InboxAttentionFilterProps {
  stats: IReviewerInboxStats;
  /** `null` = no stage filter (All). */
  value: InboxStageFilterValue | null;
  onChange: (value: InboxStageFilterValue | null) => void;
  /** Which stream the queue is narrowed to; `null` offers both groups. */
  kind: InboxKindFilter | null;
}

/** Maps a stage onto its counter in the stats payload. */
const STAT_KEY: Record<InboxAttentionReason, keyof IReviewerInboxStats> = {
  past_due: "pastDue",
  awaiting_review: "awaitingReview",
  awaiting_invoice: "awaitingInvoice",
  invoice_unpaid: "invoiceUnpaid",
  pending_review: "pendingReview",
  under_review: "underReview",
  revision_requested: "revisionRequested",
  kyb_pending: "kybPending",
  agreement_pending: "agreementPending",
};

const ALL_LABEL = "All stages";

function countForKind(stats: IReviewerInboxStats, kind: InboxKindFilter | null): number {
  if (kind === "application") return stats.applications;
  if (kind === "milestone") return stats.milestones;
  return stats.applications + stats.milestones;
}

interface StageOption {
  key: InboxStageFilterValue;
  label: string;
  /** Absent when the feed does not count this option. */
  count?: number;
  dotClass?: string;
}

interface StageGroup {
  heading: string;
  options: StageOption[];
}

/**
 * Stage filter for the community admin queue.
 *
 * One dropdown for both streams, grouped so a reader sees which stages belong
 * to applications and which to milestones. When the queue is already narrowed
 * to one stream only that group is offered. Stages with nothing behind them
 * are omitted — a "Past due 0" option leads to an empty list — and "All
 * stages" always renders so there is a way back.
 */
const InboxAttentionFilterComponent: FC<InboxAttentionFilterProps> = ({
  stats,
  value,
  onChange,
  kind,
}) => {
  const [open, setOpen] = useState(false);

  const groups = useMemo<StageGroup[]>(() => {
    const toOption = (reason: InboxAttentionReason): StageOption => ({
      key: reason,
      label: ATTENTION_META[reason].label,
      dotClass: ATTENTION_META[reason].dotClass,
      count: stats[STAT_KEY[reason]] ?? 0,
    });

    const applications: StageOption[] = APPLICATION_FILTER_ORDER.map(toOption);
    const milestones: StageOption[] = MILESTONE_FILTER_ORDER.map(toOption);

    const followUpCount = stats.followUpDue ?? 0;
    const followUp: StageOption[] = [
      ...(followUpCount > 0
        ? [
            {
              key: FOLLOW_UP_FILTER,
              label: FOLLOW_UP_FILTER_LABEL,
              dotClass: ATTENTION_META.past_due.dotClass,
              count: followUpCount,
            },
          ]
        : []),
      { key: OPEN_NOTES_FILTER, label: "Has open notes" },
    ];

    const candidates: StageGroup[] = [
      ...(kind !== "milestone" ? [{ heading: "Applications", options: applications }] : []),
      ...(kind !== "application" ? [{ heading: "Milestones", options: milestones }] : []),
      { heading: "Follow-ups", options: followUp },
    ];

    return candidates
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => option.count === undefined || option.count > 0),
      }))
      .filter((group) => group.options.length > 0);
  }, [stats, kind]);

  const total = useMemo(() => countForKind(stats, kind), [stats, kind]);

  // Nothing to filter by — don't render a control whose only options are "All"
  // and "Has open notes". A reviewer-scoped feed carries no stage counts.
  const hasCountedOption = groups.some((group) =>
    group.options.some((option) => option.count !== undefined)
  );
  if (!hasCountedOption) return null;

  const selected = groups.flatMap((group) => group.options).find((o) => o.key === value) ?? null;
  const active = selected !== null;
  const triggerLabel = selected?.label ?? ALL_LABEL;
  const triggerCount = selected ? selected.count : total;

  const choose = (next: InboxStageFilterValue | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "outline"}
          size="chip"
          aria-label={`Filter by stage: ${triggerLabel}`}
          className={cn(
            "min-w-[11rem] max-w-[min(16rem,calc(100vw-2rem))] font-medium focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
            active && "border border-primary-500 text-primary-700 dark:text-primary-300"
          )}
        >
          {selected ? (
            <span
              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", selected.dotClass)}
              aria-hidden="true"
            />
          ) : null}
          <span className="truncate">{triggerLabel}</span>
          {triggerCount !== undefined && (
            <span className="ml-auto shrink-0 tabular-nums text-xs text-gray-500 dark:text-zinc-400">
              {triggerCount}
            </span>
          )}
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No stages to filter by.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={ALL_LABEL} onSelect={() => choose(null)}>
                <CheckIcon
                  className={cn("mr-2 h-4 w-4 shrink-0", active ? "opacity-0" : "opacity-100")}
                  aria-hidden="true"
                />
                <span className="truncate">{ALL_LABEL}</span>
                <span className="ml-auto shrink-0 tabular-nums text-xs text-gray-500 dark:text-zinc-400">
                  {total}
                </span>
              </CommandItem>
            </CommandGroup>

            {groups.map((group) => (
              <React.Fragment key={group.heading}>
                <CommandSeparator />
                <CommandGroup heading={group.heading}>
                  {group.options.map((option) => (
                    <CommandItem
                      key={option.key}
                      value={option.label}
                      onSelect={() => choose(option.key)}
                    >
                      <CheckIcon
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          option.key === value ? "opacity-100" : "opacity-0"
                        )}
                        aria-hidden="true"
                      />
                      {option.dotClass && (
                        <span
                          className={cn("mr-2 h-1.5 w-1.5 shrink-0 rounded-full", option.dotClass)}
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">{option.label}</span>
                      {option.count !== undefined && (
                        <span className="ml-auto shrink-0 tabular-nums text-xs text-gray-500 dark:text-zinc-400">
                          {option.count}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const InboxAttentionFilter = React.memo(InboxAttentionFilterComponent);
InboxAttentionFilter.displayName = "InboxAttentionFilter";
