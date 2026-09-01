"use client";

import { useMemo } from "react";
import type { ApplicationStatus } from "@/types/whitelabel-entities";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import { getStatusVisual } from "./application-status-ui";

interface StatusHistoryItem {
  status: string;
  timestamp: string;
  reason: string;
}

interface ApplicationStatusStepperProps {
  status: ApplicationStatus;
  statusHistory: StatusHistoryItem[];
  currentStatusDate?: string;
}

const STATUS_SUBTITLES: Record<string, string> = {
  draft: "Not submitted yet",
  pending: "Awaiting a reviewer",
  under_review: "Being evaluated",
  revision_requested: "Changes requested",
  resubmitted: "Awaiting re-review",
  approved: "Funded & ready to build",
  rejected: "Not approved this round",
};

export function ApplicationStatusStepper({
  status,
  statusHistory,
  currentStatusDate,
}: ApplicationStatusStepperProps) {
  const heroVisual = getStatusVisual(status);

  const { currentHistoryItem, priorHistory } = useMemo(() => {
    const sortedHistory = [...(statusHistory ?? [])].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const normalizedStatus = status.toLowerCase().replace(/-/g, "_");
    let currentIndex = -1;

    for (let index = sortedHistory.length - 1; index >= 0; index -= 1) {
      const itemStatus = sortedHistory[index]?.status.toLowerCase().replace(/-/g, "_");
      if (itemStatus === normalizedStatus) {
        currentIndex = index;
        break;
      }
    }

    return {
      currentHistoryItem: currentIndex >= 0 ? sortedHistory[currentIndex] : undefined,
      priorHistory:
        currentIndex >= 0
          ? sortedHistory.filter((_, index) => index !== currentIndex)
          : sortedHistory,
    };
  }, [status, statusHistory]);

  const statusDate = currentHistoryItem?.timestamp ?? currentStatusDate;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div
        className={cn(
          "flex items-center gap-3",
          (currentHistoryItem?.reason || priorHistory.length > 0) && "mb-5"
        )}
      >
        <div
          className={cn(
            "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full",
            heroVisual.pillClass
          )}
        >
          <heroVisual.Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-lg font-semibold tracking-tight text-foreground">
            {heroVisual.label}
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
            <span>{STATUS_SUBTITLES[status] ?? "Application status"}</span>
            {statusDate && (
              <>
                <span aria-hidden>·</span>
                <time dateTime={statusDate}>{formatDate(statusDate)}</time>
              </>
            )}
          </div>
        </div>
      </div>

      {currentHistoryItem?.reason && (
        <p className="mb-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          {currentHistoryItem.reason}
        </p>
      )}

      {priorHistory.length > 0 && (
        <ol className="relative">
          {priorHistory.map((item, index) => {
            const visual = getStatusVisual(item.status);
            const isLast = index === priorHistory.length - 1;
            return (
              <li key={`${item.timestamp}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute left-[9px] top-6 h-[calc(100%-1rem)] w-0.5 bg-border"
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full",
                    visual.pillClass
                  )}
                >
                  <visual.Icon className="h-3 w-3" />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-foreground">{visual.label}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(item.timestamp)}</div>
                  {item.reason && (
                    <p className="mt-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {item.reason}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
