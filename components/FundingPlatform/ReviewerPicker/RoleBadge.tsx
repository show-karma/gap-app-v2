"use client";

import type { CommunityReviewerRole } from "@/services/community-reviewers/community-reviewers.types";
import { cn } from "@/utilities/tailwind";

export function RoleBadge({ role }: { role: CommunityReviewerRole }) {
  const isApp = role === "program-reviewer";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        isApp
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
      )}
    >
      {isApp ? "App" : "Milestone"}
    </span>
  );
}
