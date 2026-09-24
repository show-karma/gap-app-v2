"use client";

import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import React, { type FC, useMemo, useState } from "react";
import {
  ATTENTION_FILTER_ORDER,
  ATTENTION_META,
  FOLLOW_UP_FILTER,
  FOLLOW_UP_FILTER_LABEL,
} from "@/components/Inbox/attentionMeta";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { IReviewerInboxStats, MilestoneQueueFilter } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

interface InboxAttentionFilterProps {
  stats: IReviewerInboxStats;
  /** `null` = no stage filter (All). */
  value: MilestoneQueueFilter | null;
  onChange: (value: MilestoneQueueFilter | null) => void;
  /** Total milestones in the queue, for the All option. */
  totalMilestones: number;
}

/** Maps a queue filter onto its counter in the stats payload. */
const STAT_KEY: Record<MilestoneQueueFilter, keyof IReviewerInboxStats> = {
  past_due: "pastDue",
  awaiting_review: "awaitingReview",
  awaiting_invoice: "awaitingInvoice",
  invoice_unpaid: "invoiceUnpaid",
  followup_due: "followUpDue",
};

const ALL_LABEL = "All items";

interface StageOption {
  key: MilestoneQueueFilter | null;
  label: string;
  count: number;
  dotClass?: string;
}

/**
 * Stage filter for the community admin milestone queue.
 *
 * A dropdown rather than a row of chips: six bordered pills sat next to the
 * program filter and the sort control and read as one undifferentiated band of
 * buttons, with no cue as to which narrowed the list and which reordered it.
 * Collapsed, the control states the current view and its size; opened, every
 * stage and its count is one click away.
 *
 * Options with a zero count are omitted — a queue with nothing past due should
 * not offer a "Past due 0" filter that leads to an empty list. "All items"
 * always renders so there is a way back from a filtered view.
 */
const InboxAttentionFilterComponent: FC<InboxAttentionFilterProps> = ({
  stats,
  value,
  onChange,
  totalMilestones,
}) => {
  const [open, setOpen] = useState(false);

  const options = useMemo<StageOption[]>(() => {
    const stages = ATTENTION_FILTER_ORDER.map((reason) => ({
      key: reason as MilestoneQueueFilter,
      label: ATTENTION_META[reason].label,
      dotClass: ATTENTION_META[reason].dotClass,
      count: stats[STAT_KEY[reason]] ?? 0,
    })).filter((option) => option.count > 0);

    const followUpCount = stats.followUpDue ?? 0;
    if (followUpCount > 0) {
      stages.push({
        key: FOLLOW_UP_FILTER,
        label: FOLLOW_UP_FILTER_LABEL,
        dotClass: ATTENTION_META.past_due.dotClass,
        count: followUpCount,
      });
    }

    return stages;
  }, [stats]);

  // Nothing to filter by — don't render a control whose only option is "All".
  if (options.length === 0) return null;

  const selected = options.find((option) => option.key === value) ?? null;
  const active = selected !== null;
  const triggerLabel = selected?.label ?? ALL_LABEL;
  const triggerCount = selected?.count ?? totalMilestones;

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
          {selected?.dotClass ? (
            <span
              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", selected.dotClass)}
              aria-hidden="true"
            />
          ) : null}
          <span className="truncate">{triggerLabel}</span>
          <span className="ml-auto shrink-0 tabular-nums text-xs text-gray-500 dark:text-zinc-400">
            {triggerCount}
          </span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No stages to filter by.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={ALL_LABEL}
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <CheckIcon
                  className={cn("mr-2 h-4 w-4 shrink-0", active ? "opacity-0" : "opacity-100")}
                  aria-hidden="true"
                />
                <span className="truncate">{ALL_LABEL}</span>
                <span className="ml-auto shrink-0 tabular-nums text-xs text-gray-500 dark:text-zinc-400">
                  {totalMilestones}
                </span>
              </CommandItem>

              {options.map((option) => (
                <CommandItem
                  key={option.key}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.key);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      option.key === value ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                  {option.dotClass ? (
                    <span
                      className={cn("mr-2 h-1.5 w-1.5 shrink-0 rounded-full", option.dotClass)}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="truncate">{option.label}</span>
                  <span className="ml-auto shrink-0 tabular-nums text-xs text-gray-500 dark:text-zinc-400">
                    {option.count}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const InboxAttentionFilter = React.memo(InboxAttentionFilterComponent);
InboxAttentionFilter.displayName = "InboxAttentionFilter";
