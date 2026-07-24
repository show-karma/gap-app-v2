"use client";

import { memo, useEffect, useRef } from "react";
import type {
  PendingAgentWrite,
  PendingAgentWriteStatus,
} from "@/services/pending-agent-writes.service";
import { renderRelativeTime } from "@/utilities/formatRelativeTime";
import { cn } from "@/utilities/tailwind";

interface HistoryActionRowProps {
  write: PendingAgentWrite;
  isHighlighted: boolean;
}

const STATUS_BADGE: Record<PendingAgentWriteStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-secondary text-secondary-foreground",
  },
  approved: {
    label: "Approved",
    className: "bg-secondary text-secondary-foreground",
  },
  executed: {
    label: "Executed",
    className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  rejected: {
    label: "Rejected",
    className: "bg-muted text-muted-foreground",
  },
  expired: {
    label: "Expired",
    className: "bg-muted text-muted-foreground",
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive",
  },
};

export const HistoryActionRow = memo(function HistoryActionRow({
  write,
  isHighlighted,
}: HistoryActionRowProps) {
  const rowRef = useRef<HTMLLIElement>(null);
  const badge = STATUS_BADGE[write.status];

  useEffect(() => {
    if (isHighlighted) {
      rowRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  return (
    <li
      ref={rowRef}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-border bg-card p-5",
        isHighlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            badge.className
          )}
        >
          {badge.label}
        </span>
        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {write.label}
        </span>
        {write.clientName ? (
          <span className="text-xs text-muted-foreground">via {write.clientName}</span>
        ) : null}
      </div>
      <p className="text-sm font-medium text-foreground">{write.summary}</p>
      <p className="break-all font-mono text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{write.method}</span> {write.path}
      </p>
      {write.decidedAt ? (
        <p className="text-xs text-muted-foreground">
          Decided {renderRelativeTime(write.decidedAt)}
        </p>
      ) : null}
      {write.status === "failed" && write.result?.error ? (
        <p className="text-xs text-destructive">{write.result.error}</p>
      ) : null}
    </li>
  );
});
