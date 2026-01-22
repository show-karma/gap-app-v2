"use client";

import { ArrowLeftIcon, BookOpenIcon, Share2Icon } from "lucide-react";
import { useMemo } from "react";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { ActivityCard } from "@/components/Shared/ActivityCard";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { formatDate } from "@/utilities/formatDate";
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
 * Get the attester/creator address from a milestone.
 */
function getMilestoneAttester(milestone: UnifiedMilestone): string | undefined {
  // Try to get attester from various sources
  return (
    milestone.source.projectMilestone?.attester ||
    milestone.source.grantMilestone?.milestone?.attester ||
    milestone.projectUpdate?.recipient ||
    milestone.grantUpdate?.attester ||
    milestone.grantUpdate?.recipient
  );
}

/**
 * Get the text label for an activity type.
 */
function getActivityTypeLabel(type: string): string {
  switch (type) {
    case "grant":
    case "grant_update":
      return "Grant Update";
    case "project":
      return "Project Activity";
    case "impact":
      return "Project Impact";
    case "milestone":
    case "activity":
    case "update":
    default:
      return "Milestone";
  }
}

/**
 * Get icon configuration based on milestone type.
 * Matches Figma design with colored rounded-square icons.
 */
function getTypeIcon(type: string): {
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
} {
  switch (type) {
    case "grant":
    case "funding":
      return {
        bgColor: "bg-green-100 dark:bg-green-900/30",
        textColor: "text-green-600 dark:text-green-400",
        icon: <ArrowLeftIcon className="w-3.5 h-3.5" />,
      };
    case "milestone":
    case "activity":
    case "update":
    case "grant_update":
      return {
        bgColor: "bg-orange-100 dark:bg-orange-900/30",
        textColor: "text-orange-600 dark:text-orange-400",
        icon: <span className="text-xs font-bold">P</span>,
      };
    case "project":
    case "blog":
      return {
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        textColor: "text-blue-600 dark:text-blue-400",
        icon: <BookOpenIcon className="w-3.5 h-3.5" />,
      };
    case "impact":
    case "social":
      return {
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
        textColor: "text-purple-600 dark:text-purple-400",
        icon: <Share2Icon className="w-3.5 h-3.5" />,
      };
    default:
      return {
        bgColor: "bg-neutral-100 dark:bg-zinc-700",
        textColor: "text-neutral-600 dark:text-neutral-400",
        icon: <span className="text-xs font-bold">•</span>,
      };
  }
}

/**
 * ActivityFeed displays a vertical timeline of project activities.
 * Features:
 * - Vertical timeline with colored type-specific icons
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
        className={cn("text-center py-12 text-neutral-500 dark:text-neutral-400", className)}
        data-testid="activity-feed-empty"
      >
        No activities to display
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} data-testid="activity-feed">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-neutral-200 dark:bg-zinc-700" />

      {/* Timeline items */}
      <div className="flex flex-col gap-6">
        {sortedMilestones.map((milestone, index) => {
          const typeIcon = getTypeIcon(milestone.type);

          return (
            <div
              key={milestone.uid || index}
              className="relative pl-10"
              data-testid="activity-item"
            >
              {/* Timeline icon - colored rounded square */}
              <div
                className={cn(
                  "absolute left-0 top-0 w-6 h-6 rounded-lg flex items-center justify-center",
                  typeIcon.bgColor,
                  typeIcon.textColor
                )}
                data-testid="timeline-icon"
              >
                {typeIcon.icon}
              </div>

              {/* Status Text, Due Date, and Posted By */}
              <div className="flex flex-row items-center justify-between gap-2 mb-3 flex-wrap">
                {/* Left side: Status and Due Date */}
                <div className="flex flex-row items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">
                    {getActivityTypeLabel(milestone.type)}
                  </span>
                  {milestone.endsAt && (
                    <span className="text-sm font-semibold text-muted-foreground">
                      Due by {formatDate(new Date(milestone.endsAt * 1000).toISOString())}
                    </span>
                  )}
                </div>

                {/* Right side: Posted by */}
                {(() => {
                  const attester = getMilestoneAttester(milestone);
                  return (
                    <div className="flex flex-row items-center gap-2 text-sm font-medium leading-5 text-muted-foreground">
                      <span>Posted {formatDate(milestone.createdAt)}</span>
                      {attester && (
                        <>
                          <span>by</span>
                          <EthereumAddressToENSAvatar
                            address={attester}
                            className="h-8 w-8 min-h-8 min-w-8 rounded-full"
                          />
                          <span className="text-sm font-semibold leading-5 text-foreground">
                            <EthereumAddressToENSName address={attester} />
                          </span>
                        </>
                      )}
                    </div>
                  );
                })()}
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
          );
        })}
      </div>

      {/* Timeline end dot */}
      <div className="absolute left-[9px] bottom-0 w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-zinc-600" />
    </div>
  );
}
