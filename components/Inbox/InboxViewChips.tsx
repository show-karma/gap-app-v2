"use client";

import React, { type FC } from "react";
import { ATTENTION_META } from "@/components/Inbox/attentionMeta";
import { Button } from "@/components/ui/button";
import type { InboxQueueFilter, IReviewerInboxStats } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

interface InboxViewChipsProps {
  stats: IReviewerInboxStats;
  /** `null` = the whole queue. */
  value: InboxQueueFilter | null;
  onChange: (value: InboxQueueFilter | null) => void;
}

interface Chip {
  key: InboxQueueFilter | null;
  label: string;
  count: number;
}

/**
 * The views an admin actually works from, as chips that filter the queue.
 * They replace a summary line of the same numbers next to the title, which
 * read as statistics rather than as places to go. Counts come from the full
 * feed so they hold steady while a chip is active; a chip with nothing behind
 * it is not offered.
 */
const InboxViewChipsComponent: FC<InboxViewChipsProps> = ({ stats, value, onChange }) => {
  const candidates: Chip[] = [
    { key: "followup_due", label: "Follow-ups due", count: stats.followUpDue ?? 0 },
    { key: "past_due", label: ATTENTION_META.past_due.label, count: stats.pastDue ?? 0 },
    {
      key: "invoice_unpaid",
      label: ATTENTION_META.invoice_unpaid.label,
      count: stats.invoiceUnpaid ?? 0,
    },
    { key: null, label: "All", count: stats.applications + stats.milestones },
  ];
  const chips = candidates.filter((chip) => chip.count > 0);

  if (chips.length <= 1) return null;

  return (
    <nav aria-label="Queue views" className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => {
        const active = chip.key === value;
        return (
          <Button
            key={chip.key ?? "all"}
            type="button"
            variant={active ? "secondary" : "outline"}
            size="chip"
            aria-pressed={active}
            onClick={() => onChange(chip.key)}
            className={cn(
              "gap-1.5 font-medium",
              active && "border border-primary-500 text-primary-700 dark:text-primary-300"
            )}
          >
            {chip.label}
            <span
              className={cn(
                "tabular-nums text-xs",
                active
                  ? "text-primary-600 dark:text-primary-300"
                  : "text-gray-500 dark:text-zinc-400"
              )}
            >
              {chip.count}
            </span>
          </Button>
        );
      })}
    </nav>
  );
};

export const InboxViewChips = React.memo(InboxViewChipsComponent);
InboxViewChips.displayName = "InboxViewChips";
