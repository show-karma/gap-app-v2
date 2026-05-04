"use client";

import { BadgeCheck, CircleDollarSign, Goal, Rss } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useMemo } from "react";
import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import { ActivityCard } from "@/components/Shared/ActivityCard";
import { useMilestoneAllocationsByGrants } from "@/hooks/useCommunityMilestoneAllocations";
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
 * Get the text label for an activity type.
 * Note: "impact" type should display as "Milestone" to match staging behavior,
 * where project impacts are shown as milestones with the title "Project Impact".
 */
function getActivityTypeLabel(type: string, milestone?: UnifiedMilestone): string {
  switch (type) {
    case "grant_update":
      return "Grant Update";
    case "grant_received": {
      const programType = milestone?.grantReceived?.programType;
      if (programType === "hackathon") return "Hackathon Participation";
      return "Grant Approved";
    }
    case "project":
    case "activity":
    case "update":
      return "Project Activity";
    case "impact":
    case "grant":
    case "milestone":
    default:
      return "Milestone";
  }
}

interface TimelineItemProps {
  milestone: UnifiedMilestone;
  projectId: string | undefined;
  isAuthorized: boolean;
  formatDisplayDate: (dateStr: string) => string;
  allocationAmount?: string;
}

const TimelineItem = React.memo(function TimelineItem({
  milestone,
  projectId,
  isAuthorized,
  formatDisplayDate,
  allocationAmount,
}: TimelineItemProps) {
  return (
    <div className="relative pl-8 max-lg:pl-7" data-testid="activity-item">
      {/* Timeline icon - positioned relative to item, not content row */}
      <div
        className={cn(
          "absolute left-0 top-0 w-6 h-6 max-lg:w-5 max-lg:h-5 rounded-full border flex items-center justify-center",
          "border-foreground/10",
          "ring-2 ring-white dark:ring-zinc-900",
          milestone.type === "grant_received" &&
            "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
          (milestone.type === "grant_update" ||
            milestone.type === "activity" ||
            milestone.type === "update" ||
            milestone.type === "project") &&
            "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
          milestone.type === "endorsement" &&
            "bg-pink-50 text-pink-500 dark:bg-pink-950 dark:text-pink-400",
          milestone.type === "milestone" &&
            "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
          (milestone.type === "grant" || milestone.type === "impact") &&
            "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
        )}
        data-testid="timeline-icon"
      >
        {milestone.type === "grant_received" ? (
          <CircleDollarSign className="w-3.5 h-3.5 max-lg:w-3 max-lg:h-3" />
        ) : milestone.type === "grant_update" ||
          milestone.type === "activity" ||
          milestone.type === "update" ||
          milestone.type === "project" ? (
          <Rss className="w-3.5 h-3.5 max-lg:w-3 max-lg:h-3" />
        ) : milestone.type === "endorsement" ? (
          <BadgeCheck className="w-3.5 h-3.5 max-lg:w-3 max-lg:h-3" />
        ) : (
          <Goal className="w-3.5 h-3.5 max-lg:w-3 max-lg:h-3" />
        )}
      </div>

      {/* Status Text, Due Date, and Posted By */}
      <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between lg:gap-2 mb-3">
        {/* Endorsement - special format */}
        {milestone.type === "endorsement" && milestone.endorsement ? (
          <>
            <div className="flex flex-row items-center gap-1.5 lg:gap-2 flex-wrap">
              <span className="text-xs lg:text-sm font-semibold text-foreground">Endorsed by</span>
              <span className="text-xs lg:text-sm font-semibold text-foreground">
                <EthereumAddressToProfileName
                  address={milestone.endorsement.endorsedBy}
                  showProfilePicture
                  pictureClassName="h-5 w-5 lg:h-6 lg:w-6 min-w-5 min-h-5 lg:min-w-6 lg:min-h-6 rounded-full"
                />
              </span>
            </div>
            <div className="flex flex-row items-center gap-1.5 lg:gap-2 text-xs lg:text-sm font-medium leading-5 text-muted-foreground">
              <span>{formatDisplayDate(milestone.createdAt)}</span>
            </div>
          </>
        ) : /* Grant Received - match milestone header format */
        milestone.type === "grant_received" ? (
          <>
            <div className="flex flex-row items-center gap-1.5 lg:gap-2 flex-wrap">
              <span className="text-xs lg:text-sm font-semibold text-foreground">
                {milestone.grantReceived?.programType === "hackathon"
                  ? "Hackathon participation"
                  : "Grant approved"}
              </span>
            </div>

            {/* Grant title on a new line when it differs from community name */}
            {(() => {
              const title = milestone.grantReceived?.grantTitle?.trim();
              const community = milestone.grantReceived?.communityName?.trim();
              const isDuplicate =
                title && community && title.toLowerCase() === community.toLowerCase();
              return title && !isDuplicate ? (
                <span className="text-xs text-muted-foreground" data-testid="grant-title">
                  {title}
                </span>
              ) : null;
            })()}
          </>
        ) : (
          <div className="flex flex-row items-center gap-1.5 lg:gap-2 flex-wrap">
            <span className="text-xs lg:text-sm font-semibold text-foreground">
              {getActivityTypeLabel(milestone.type, milestone)}
            </span>
          </div>
        )}
      </div>

      {/* Activity Card for all types */}
      <ActivityCard
        activity={
          milestone.type === "grant_received"
            ? {
                type: "fundingReceived",
                data: milestone,
                projectId,
              }
            : milestone.type === "endorsement"
              ? {
                  type: "endorsement",
                  data: milestone,
                }
              : {
                  type: "milestone",
                  data: milestone,
                  allocationAmount,
                }
        }
        isAuthorized={isAuthorized}
      />
    </div>
  );
});

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
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  // Extract unique grant UIDs for allocation lookup
  const grantUIDs = useMemo(() => {
    const uids = new Set<string>();
    for (const m of milestones) {
      const grantUid = m.source.grantMilestone?.grant?.uid;
      if (grantUid) uids.add(grantUid);
    }
    return Array.from(uids);
  }, [milestones]);

  const { allocationMap } = useMilestoneAllocationsByGrants(grantUIDs);

  // Map filter types to milestone types
  const getFilteredTypes = (filters: ActivityFilterType[]): string[] => {
    const typeMap: Record<ActivityFilterType, string[]> = {
      funding: ["grant_received"],
      milestones: ["grant", "milestone"],
      updates: ["grant_update", "project", "update", "activity"],
      endorsements: ["endorsement"],
      blog: [],
      socials: [],
      other: ["impact"],
    };

    return filters.flatMap((filter) => typeMap[filter]);
  };

  // Pure utility function for sorting - uses seconds for consistency
  // Matches production sorting logic: endsAt (dueDate) -> completed.createdAt -> createdAt
  const getSortTimestamp = (item: UnifiedMilestone): number => {
    // endsAt is already in seconds (Unix timestamp)
    if (item.endsAt) return item.endsAt;
    // Convert other dates to seconds for consistent comparison
    if (item.completed && typeof item.completed === "object" && "createdAt" in item.completed) {
      return Math.floor(new Date(item.completed.createdAt).getTime() / 1000);
    }
    return Math.floor(new Date(item.createdAt).getTime() / 1000);
  };

  // Filter and sort milestones
  const sortedMilestones = useMemo(() => {
    let filtered = [...milestones];

    // Apply filters if any are active
    if (activeFilters.length > 0) {
      const allowedTypes = getFilteredTypes(activeFilters);
      filtered = filtered.filter((milestone) => allowedTypes.includes(milestone.type));
    }

    // Milestone status filtering is now done server-side via API query param

    // Sort by date using same logic as production (ProjectRoadmap)
    filtered.sort((a, b) => {
      const timestampA = getSortTimestamp(a);
      const timestampB = getSortTimestamp(b);
      return sortBy === "newest" ? timestampB - timestampA : timestampA - timestampB;
    });

    return filtered;
  }, [milestones, sortBy, activeFilters]);

  // Format date for display - always show the actual date
  const formatDisplayDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    // Always return the formatted date (e.g., "Jan 23, 2024")
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (sortedMilestones.length === 0) {
    return (
      <div
        className={cn("text-center py-12 text-muted-foreground", className)}
        data-testid="activity-feed-empty"
      >
        No activities to display
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} data-testid="activity-feed">
      {/* Timeline line - centered under icons (w-6=24px, so center at 12px on desktop, w-5=20px so 10px on mobile) */}
      <div className="absolute left-[11px] max-lg:left-[9px] top-2 bottom-0 w-0.5 bg-border" />

      {/* Timeline items */}
      <div className="flex flex-col gap-12 pb-12">
        {sortedMilestones.map((milestone, index) => {
          const uniqueKey = `${milestone.type}-${milestone.uid}-${index}`;

          return (
            <TimelineItem
              key={uniqueKey}
              milestone={milestone}
              projectId={projectId}
              isAuthorized={isAuthorized}
              formatDisplayDate={formatDisplayDate}
              allocationAmount={
                allocationMap.get(milestone.uid) ?? allocationMap.get(milestone.uid.toLowerCase())
              }
            />
          );
        })}
      </div>

      {/* Timeline end dot - aligned with line */}
      <div className="absolute left-[9px] max-lg:left-[8px] bottom-0 w-1.5 h-1.5 rounded-full bg-border" />
    </div>
  );
}
