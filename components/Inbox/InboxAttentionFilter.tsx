"use client";

import React, { type FC } from "react";
import {
  ATTENTION_FILTER_ORDER,
  ATTENTION_META,
  FOLLOW_UP_FILTER,
  FOLLOW_UP_FILTER_LABEL,
} from "@/components/Inbox/attentionMeta";
import { Button } from "@/components/ui/button";
import type { IReviewerInboxStats, MilestoneQueueFilter } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

interface InboxAttentionFilterProps {
  stats: IReviewerInboxStats;
  /** `null` = no stage filter (All). */
  value: MilestoneQueueFilter | null;
  onChange: (value: MilestoneQueueFilter | null) => void;
  /** Total milestones in the queue, for the All chip. */
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

interface ChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  dotClass?: string;
}

const Chip: FC<ChipProps> = ({ label, count, active, onClick, dotClass }) => (
  <Button
    type="button"
    variant={active ? "secondary" : "outline"}
    size="chip"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "font-medium focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
      active && "border border-primary-500 text-primary-700 dark:text-primary-300"
    )}
  >
    {dotClass ? (
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} aria-hidden="true" />
    ) : null}
    <span>{label}</span>
    <span className="text-xs text-gray-500 dark:text-zinc-400">{count}</span>
  </Button>
);

/**
 * Stage filter for the community admin milestone queue.
 *
 * Chips with a zero count are hidden: a queue with nothing past due should not
 * advertise a "Past due 0" filter that leads nowhere. "All" always renders so
 * there is a way back from a filtered view.
 */
const InboxAttentionFilterComponent: FC<InboxAttentionFilterProps> = ({
  stats,
  value,
  onChange,
  totalMilestones,
}) => {
  const reasonChips = ATTENTION_FILTER_ORDER.map((reason) => ({
    key: reason,
    label: ATTENTION_META[reason].label,
    dotClass: ATTENTION_META[reason].dotClass,
    count: stats[STAT_KEY[reason]] ?? 0,
  })).filter((chip) => chip.count > 0);

  const followUpCount = stats.followUpDue ?? 0;

  // Nothing to filter by — don't render a lone "All" chip.
  if (reasonChips.length === 0 && followUpCount === 0) return null;

  return (
    <fieldset className="flex flex-wrap items-center gap-2 border-0 p-0">
      <legend className="sr-only">Filter milestone queue by stage</legend>
      <Chip
        label="All"
        count={totalMilestones}
        active={value === null}
        onClick={() => onChange(null)}
      />
      {reasonChips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          count={chip.count}
          dotClass={chip.dotClass}
          active={value === chip.key}
          onClick={() => onChange(chip.key)}
        />
      ))}
      {followUpCount > 0 ? (
        <Chip
          label={FOLLOW_UP_FILTER_LABEL}
          count={followUpCount}
          active={value === FOLLOW_UP_FILTER}
          onClick={() => onChange(FOLLOW_UP_FILTER)}
        />
      ) : null}
    </fieldset>
  );
};

export const InboxAttentionFilter = React.memo(InboxAttentionFilterComponent);
InboxAttentionFilter.displayName = "InboxAttentionFilter";
