"use client";

import {
  CheckIcon,
  ClockIcon,
  DocumentTextIcon,
  FireIcon,
  FlagIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type { FC } from "react";
import type { InboxItem } from "@/components/Inbox/types";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

/**
 * Small presentational badges for the Reviewer Inbox list and detail panes.
 * All atoms are pure (props in, markup out) and use Tailwind theme tokens —
 * no hardcoded colors. The mock's Karma teal accent maps to the app's
 * teal/brand classes.
 */

/* ------------------------------------------------------------------ */
/* Status tones — raw application/milestone status -> Tailwind classes */
/* ------------------------------------------------------------------ */
type Tone = "blue" | "pink" | "amber" | "yellow" | "green" | "red" | "slate";

const TONE_BADGE: Record<Tone, string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-zinc-700 dark:text-zinc-200",
};

/** Maps a raw status string to a visual tone and a humanized label. */
const STATUS_TONE: Record<string, Tone> = {
  // applications
  pending: "blue",
  resubmitted: "blue",
  under_review: "pink",
  revision_requested: "amber",
  approved: "green",
  rejected: "red",
  withdrawn: "slate",
  // milestones — hues follow MILESTONE_STATUS_CONFIG in
  // components/Pages/Admin/MilestonesReview/utils/milestone-review-status.ts;
  // dark mode keeps this file's standard /40 overlay opacity.
  completed: "yellow",
  pending_verification: "yellow",
  verified: "green",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending review",
  resubmitted: "Resubmitted",
  under_review: "Under review",
  revision_requested: "Revision requested",
  approved: "Approved",
  rejected: "Declined",
  withdrawn: "Withdrawn",
  completed: "Pending Verification",
  pending_verification: "Pending Verification",
  pending_completion: "In progress",
  verified: "Verified",
};

const humanize = (status: string): string =>
  status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const labelOf = (status: string): string => STATUS_LABEL[status] ?? humanize(status);

const toneOf = (status: string): Tone => STATUS_TONE[status] ?? "slate";

/* ------------------------------------------------------------------ */
/* KindTag — Application | Milestone                                   */
/* ------------------------------------------------------------------ */
export const KindTag: FC<{ kind: InboxItem["kind"]; className?: string }> = ({
  kind,
  className,
}) => {
  const isApp = kind === "application";
  const Icon = isApp ? DocumentTextIcon : FlagIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
        isApp
          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
          : "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {isApp ? "Application" : "Milestone"}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* StatusBadge — colored pill for the raw status                       */
/* ------------------------------------------------------------------ */
export const StatusBadge: FC<{ status: string; className?: string }> = ({ status, className }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
      TONE_BADGE[toneOf(status)],
      className
    )}
  >
    {labelOf(status)}
  </span>
);

/* ------------------------------------------------------------------ */
/* DueChip — milestone due / overdue indicator                         */
/* ------------------------------------------------------------------ */
export const DueChip: FC<{ item: InboxItem; className?: string }> = ({ item, className }) => {
  if (item.kind !== "milestone") return null;

  if (item.bucket === "done") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 dark:text-zinc-500",
          className
        )}
      >
        <CheckIcon className="h-3 w-3" aria-hidden="true" /> Cleared
      </span>
    );
  }

  if (item.overdue) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-300",
          className
        )}
      >
        <FireIcon className="h-3 w-3" aria-hidden="true" /> Overdue
      </span>
    );
  }

  if (!item.dueLabel) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400",
        className
      )}
    >
      <ClockIcon className="h-3 w-3" aria-hidden="true" /> Due {formatDate(item.dueLabel)}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* AiScore — purple sparkle score, hidden when absent                  */
/* ------------------------------------------------------------------ */
export const AiScore: FC<{ score?: number; className?: string }> = ({ score, className }) => {
  // Use a null-check (not falsy) so a genuine `0` score still renders.
  if (score == null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-300",
        className
      )}
    >
      <SparklesIcon className="h-3 w-3" aria-hidden="true" /> {score}
    </span>
  );
};
