"use client";

import type { ApplicationStatus } from "@/types/whitelabel-entities";
import { cn } from "@/utilities/tailwind";

interface StatusStyle {
  pill: string;
  dot: string;
  label: string;
}

const STATUS_STYLES: Record<ApplicationStatus, StatusStyle> = {
  under_review: {
    pill: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
    label: "Under review",
  },
  pending: {
    pill: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
    label: "Pending",
  },
  resubmitted: {
    pill: "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
    dot: "bg-violet-500",
    label: "Resubmitted",
  },
  revision_requested: {
    pill: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-600",
    label: "Needs info",
  },
  approved: {
    pill: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "Approved",
  },
  rejected: {
    pill: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
    dot: "bg-red-600",
    label: "Declined",
  },
  draft: {
    pill: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    dot: "bg-zinc-500",
    label: "Draft",
  },
};

export function StatusPill({ status }: { status: ApplicationStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        style.pill
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden />
      {style.label}
    </span>
  );
}
