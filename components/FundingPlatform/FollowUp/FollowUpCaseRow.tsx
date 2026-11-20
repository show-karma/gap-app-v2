"use client";

import { formatDistanceToNow } from "date-fns";
import { memo } from "react";
import { Button as UiButton } from "@/components/ui/button";
import type { FollowUpCaseSummary } from "@/services/followUpAgent.service";
import { cn } from "@/utilities/tailwind";
import { stageLabel } from "./followUpPresentation";

interface FollowUpCaseRowProps {
  readonly item: FollowUpCaseSummary;
  readonly selected: boolean;
  readonly onSelect: (milestoneUid: string) => void;
}

function stageChipClass(needsOperator: boolean, closed: boolean): string {
  if (needsOperator) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  if (closed) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  return "bg-muted text-muted-foreground";
}

function FollowUpCaseRowBase({ item, selected, onSelect }: FollowUpCaseRowProps) {
  const closed = Boolean(item.closedAt);
  return (
    <UiButton
      variant="ghost"
      onClick={() => onSelect(item.milestoneUid)}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "h-auto w-full flex-col items-start gap-1 rounded-lg border px-3 py-3 text-left whitespace-normal",
        selected ? "border-primary/40 bg-primary/5" : "border-transparent",
        item.needsOperator &&
          !selected &&
          "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/10"
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="truncate font-medium text-foreground">
          {item.milestoneTitle || "Untitled milestone"}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            stageChipClass(item.needsOperator, closed)
          )}
        >
          {stageLabel(item.stage, closed)}
        </span>
      </div>
      {item.lastEntry ? (
        <span className="line-clamp-2 text-sm font-normal text-muted-foreground">
          {item.lastEntry.text}
        </span>
      ) : null}
      <span className="text-xs font-normal text-muted-foreground">
        {item.referenceNumber ? `${item.referenceNumber} · ` : ""}
        {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
      </span>
    </UiButton>
  );
}

export const FollowUpCaseRow = memo(FollowUpCaseRowBase);
