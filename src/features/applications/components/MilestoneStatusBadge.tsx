"use client";

import {
  isMilestoneCompleted,
  isMilestoneLate,
  isMilestoneVerified,
} from "@/src/features/applications/lib/milestone-status";
import type { MilestoneStatusEntry } from "@/types/whitelabel-entities";
import { cn } from "@/utilities/tailwind";

interface MilestoneStatusBadgeProps {
  /**
   * Server-merged status entry for this milestone. Missing means the
   * milestone hasn't been linked on-chain yet — treated as Pending.
   */
  entry?: MilestoneStatusEntry;
  className?: string;
}

type Tone = "success" | "warning" | "danger" | "neutral";

interface BadgeSpec {
  label: string;
  tone: Tone;
}

const TONE_CLASSES: Record<Tone, string> = {
  // Aligns with PROGRESS_BUCKET_CONFIG in MilestonesReview: green for
  // verified, yellow for pending, red for late, gray for not-yet-started.
  // Amber sits between yellow-pending and green-verified to signal
  // "done but not verified yet".
  success:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700",
  warning:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700",
  danger:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700",
  neutral:
    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-700 dark:text-gray-300 dark:border-zinc-600",
};

function resolveSpec(entry?: MilestoneStatusEntry): BadgeSpec {
  // Order matters: Verified wins over Completed (a verified milestone
  // is by definition also completed); Late only applies when not yet
  // completed/verified.
  if (isMilestoneVerified(entry)) return { label: "Verified", tone: "success" };
  if (isMilestoneCompleted(entry)) return { label: "Pending Verification", tone: "warning" };
  if (isMilestoneLate(entry)) return { label: "Late", tone: "danger" };
  return { label: "Pending", tone: "neutral" };
}

/**
 * Inline status badge for a single milestone, driven by the server-merged
 * `milestoneStatuses[]` entry. Drop next to the milestone title in
 * `ApplicationContent` / `ApplicationDataView` to give admin reviewers
 * inline status awareness without leaving the application detail page.
 *
 * Status hierarchy: Verified > PendingVerification > Late > Pending. The
 * "PendingVerification" label is the canonical name for a milestone the
 * grantee has marked completed but a reviewer hasn't yet attested as
 * verified — replaces the older "Completed" label which conflated the
 * two states.
 */
export function MilestoneStatusBadge({ entry, className }: MilestoneStatusBadgeProps) {
  const { label, tone } = resolveSpec(entry);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
