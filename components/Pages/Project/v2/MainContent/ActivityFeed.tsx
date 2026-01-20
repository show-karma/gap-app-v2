"use client";

import { useMemo } from "react";
import { ActivityCard } from "@/components/Shared/ActivityCard";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { cn } from "@/utilities/tailwind";
import type { ActivityFilterType, SortOption } from "./ActivityFilters";

interface ActivityFeedProps {
  milestones: UnifiedMilestone[];
  isAuthorized?: boolean;
  sortBy?: SortOption;
  activeFilters?: ActivityFilterType[];
  className?: string;
}

/**
 * ActivityFeed displays a vertical timeline of project activities.
 * Features:
 * - Vertical timeline with dots
 * - Date headers for each item
 * - Activity cards for different types (milestone, update, etc.)
 */
export function ActivityFeed({
  milestones,
  isAuthorized = false,
  sortBy = "newest",
  activeFilters = [],
  className,
}: ActivityFeedProps) {
  // Map filter types to milestone types
  const getFilteredTypes = (filters: ActivityFilterType[]): string[] => {
    const typeMap: Record<ActivityFilterType, string[]> = {
      funding: ["grant"],
      updates: ["activity", "grant_update", "update"],
      blog: ["project"], // Using project type for blog-like updates
      socials: ["impact"], // Using impact type for social-like updates
      other: ["milestone"],
    };

    return filters.flatMap((filter) => typeMap[filter]);
  };

  // Filter and sort milestones
  const sortedMilestones = useMemo(() => {
    let filtered = [...milestones];

    // Apply filters if any are active
    if (activeFilters.length > 0) {
      const allowedTypes = getFilteredTypes(activeFilters);
      filtered = filtered.filter((milestone) => allowedTypes.includes(milestone.type));
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [milestones, sortBy, activeFilters]);

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (sortedMilestones.length === 0) {
    return (
      <div
        className={cn("text-center py-12 text-gray-500 dark:text-gray-400", className)}
        data-testid="activity-feed-empty"
      >
        No activities to display
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} data-testid="activity-feed">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-zinc-700" />

      {/* Timeline items */}
      <div className="flex flex-col gap-6">
        {sortedMilestones.map((milestone, index) => (
          <div key={milestone.uid || index} className="relative pl-8" data-testid="activity-item">
            {/* Timeline dot */}
            <div
              className={cn(
                "absolute left-0 top-2 w-6 h-6 rounded-full border-2 flex items-center justify-center",
                milestone.completed
                  ? "bg-green-500 border-green-500"
                  : "bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600"
              )}
              data-testid="timeline-dot"
            >
              {milestone.completed && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-label="Completed"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>

            {/* Date header */}
            <div
              className="text-sm text-gray-500 dark:text-gray-400 mb-2"
              data-testid="activity-date"
            >
              {formatDate(milestone.createdAt)}
            </div>

            {/* Activity Card */}
            <ActivityCard
              activity={{
                type: "milestone",
                data: milestone,
              }}
              isAuthorized={isAuthorized}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
