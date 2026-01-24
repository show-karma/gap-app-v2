"use client";

import { ArrowLeftToLine } from "lucide-react";
import { useMemo } from "react";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { ActivityCard } from "@/components/Shared/ActivityCard";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import formatCurrency from "@/utilities/formatCurrency";
import { cn } from "@/utilities/tailwind";
import type { ActivityFilterType, SortOption } from "./ActivityFilters";

/**
 * Flag icon component matching Figma design.
 * Uses currentColor to inherit text color from parent.
 */
function FlagIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="14"
      viewBox="0 0 13 14"
      fill="none"
      className={className}
    >
      <path
        d="M3.64355 0C4.71352 0 5.59584 0.360795 6.33691 0.657227C7.10508 0.964491 7.73258 1.20796 8.47363 1.20801C9.29455 1.20801 9.80279 1.07065 10.082 0.958984C10.222 0.903005 10.3086 0.852176 10.3506 0.824219C10.3703 0.811056 10.3809 0.802358 10.3828 0.800781C10.3821 0.801285 10.3799 0.803002 10.377 0.805664C10.375 0.80744 10.372 0.80973 10.3691 0.8125L10.3613 0.820312C10.5758 0.608171 10.8968 0.545585 11.1758 0.661133C11.4559 0.777213 11.6386 1.05031 11.6387 1.35352V8.59863C11.6386 8.79733 11.5594 8.98837 11.4189 9.12891L10.8887 8.59863C11.3722 9.08214 11.4146 9.12579 11.418 9.12988V9.13086L11.416 9.13281C11.4149 9.13376 11.4132 9.13468 11.4121 9.13574C11.4098 9.13803 11.4069 9.14105 11.4043 9.14355C11.3989 9.14868 11.3924 9.15506 11.3857 9.16113C11.3721 9.17354 11.3552 9.18824 11.3359 9.2041C11.2969 9.23624 11.2461 9.27508 11.1826 9.31738C11.0547 9.40263 10.8756 9.50288 10.6387 9.59766C10.1632 9.78774 9.46333 9.95312 8.47363 9.95312C7.40377 9.95308 6.52129 9.59231 5.78027 9.2959C5.01198 8.98858 4.38474 8.74512 3.64355 8.74512C2.8225 8.74513 2.31434 8.88149 2.03516 8.99316C2.01494 9.00125 1.9965 9.0107 1.97852 9.01855V12.8252C1.97842 13.2393 1.64267 13.5752 1.22852 13.5752C0.814388 13.5752 0.478614 13.2393 0.478516 12.8252V1.35352C0.478584 1.15482 0.557811 0.963809 0.698242 0.823242L1.22852 1.35352C0.738079 0.863079 0.7016 0.825419 0.699219 0.822266H0.700195L0.701172 0.820312C0.702214 0.819283 0.703913 0.817554 0.705078 0.816406C0.707329 0.814209 0.710322 0.81198 0.712891 0.80957C0.718321 0.80439 0.724658 0.798174 0.731445 0.791992C0.745141 0.779545 0.761872 0.76499 0.78125 0.749023C0.820377 0.716802 0.871839 0.678225 0.935547 0.635742C1.06342 0.550506 1.2416 0.450251 1.47852 0.355469C1.95401 0.165308 2.65357 1.23127e-05 3.64355 0ZM3.64355 1.5C2.8225 1.50001 2.31434 1.63637 2.03516 1.74805C2.01503 1.75611 1.99644 1.76564 1.97852 1.77344V7.43848C2.40821 7.32598 2.95567 7.24513 3.64355 7.24512C4.7135 7.24512 5.59585 7.60592 6.33691 7.90234C7.10508 8.20961 7.73258 8.45308 8.47363 8.45312C9.29455 8.45312 9.80279 8.31577 10.082 8.2041C10.1023 8.19599 10.1206 8.1856 10.1387 8.17773V2.51367C9.70898 2.62614 9.16146 2.70801 8.47363 2.70801C7.40365 2.70796 6.52134 2.34623 5.78027 2.0498C5.01199 1.74249 4.38473 1.5 3.64355 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

interface ActivityFeedProps {
  milestones: UnifiedMilestone[];
  isAuthorized?: boolean;
  sortBy?: SortOption;
  activeFilters?: ActivityFilterType[];
  className?: string;
}

/**
 * Get the attester/creator address from a milestone.
 * Checks multiple sources in order of preference.
 */
function getMilestoneAttester(milestone: UnifiedMilestone): string | undefined {
  // Try to get attester from various sources in order of preference
  return (
    // Project milestone sources
    milestone.source.projectMilestone?.attester ||
    milestone.source.projectMilestone?.completed?.attester ||
    // Grant milestone sources
    milestone.source.grantMilestone?.milestone?.attester ||
    milestone.source.grantMilestone?.milestone?.completed?.attester ||
    milestone.source.grantMilestone?.completionDetails?.completedBy ||
    // Project update sources
    milestone.projectUpdate?.recipient ||
    // Grant update sources
    milestone.grantUpdate?.attester ||
    milestone.grantUpdate?.recipient
  );
}

/**
 * Get the text label for an activity type.
 */
function getActivityTypeLabel(type: string): string {
  switch (type) {
    case "grant_update":
      return "Grant Update";
    case "grant_received":
      return "Grant Received";
    case "project":
      return "Project Activity";
    case "impact":
      return "Project Impact";
    case "grant":
    case "milestone":
    case "activity":
    case "update":
    default:
      return "Milestone";
  }
}

/**
 * Format grant amount using the same logic as Grant Overview.
 * Handles amounts like "10000 USDC" or plain numbers.
 * Returns null if amount is missing, empty, or zero.
 */
function formatGrantAmount(amount?: string): string | null {
  if (!amount) return null;

  // Handle amounts with currency suffix (e.g., "10000 USDC")
  const parts = amount.split(" ");
  const numericPart = parts[0]?.replace(",", "");
  const currencySuffix = parts.length > 1 ? parts.slice(1).join(" ") : null;

  const numAmount = Number(numericPart);
  if (isNaN(numAmount) || numAmount === 0) return null;

  // Format the number using the same utility as Grant Overview
  if (numAmount < 1000) {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numAmount);
    return currencySuffix ? `${formatted} ${currencySuffix}` : formatted;
  }

  const formattedNum = formatCurrency(numAmount);
  return currencySuffix ? `${formattedNum} ${currencySuffix}` : formattedNum;
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
      funding: ["grant", "grant_received"],
      updates: ["activity", "grant_update", "update"],
      blog: ["project"], // Using project type for blog-like updates
      socials: ["impact"], // Using impact type for social-like updates
      other: ["milestone"],
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

  // Check if a timestamp is valid (not 0 or epoch)
  const isValidTimestamp = (timestamp: number | undefined): boolean => {
    if (!timestamp || timestamp === 0) return false;
    // Check if date is before year 2000 (likely invalid)
    const date = new Date(timestamp * 1000);
    return date.getFullYear() >= 2000;
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
      {/* Timeline line - centered under icons (w-6=24px, so center at 12px on desktop, w-5=20px so 10px on mobile) */}
      <div className="absolute left-[11px] max-lg:left-[9px] top-2 bottom-0 w-0.5 bg-neutral-200 dark:bg-zinc-700" />

      {/* Timeline items */}
      <div className="flex flex-col gap-6">
        {sortedMilestones.map((milestone, index) => {
          // Create unique key combining type, uid, and index to handle duplicate uids
          const uniqueKey = `${milestone.type}-${milestone.uid}-${index}`;

          return (
            <div key={uniqueKey} className="relative pl-8 max-lg:pl-7" data-testid="activity-item">
              {/* Timeline icon - positioned relative to item, not content row */}
              <div
                className={cn(
                  "absolute left-0 top-0 w-6 h-6 max-lg:w-5 max-lg:h-5 rounded-full border flex items-center justify-center",
                  milestone.type === "grant_received"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-900/30 dark:bg-orange-950/30 dark:text-orange-400"
                )}
                data-testid="timeline-icon"
              >
                {milestone.type === "grant_received" ? (
                  <ArrowLeftToLine className="w-3.5 h-3.5 max-lg:w-3 max-lg:h-3" />
                ) : (
                  <FlagIcon className="max-lg:scale-90" />
                )}
              </div>

              {/* Status Text, Due Date, and Posted By */}
              <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between lg:gap-2 mb-3">
                {/* Grant Received - special format */}
                {milestone.type === "grant_received" && milestone.grantReceived ? (
                  <>
                    {/* Left side: Amount + Grant Received from + Community */}
                    <div className="flex flex-row items-center gap-1.5 lg:gap-2 flex-wrap">
                      {(() => {
                        const formattedAmount = formatGrantAmount(milestone.grantReceived.amount);
                        return formattedAmount ? (
                          <span className="text-xs lg:text-sm font-semibold text-foreground">
                            {formattedAmount}
                          </span>
                        ) : null;
                      })()}
                      <span className="text-xs lg:text-sm font-semibold text-foreground">
                        Grant Received
                      </span>
                      <span className="text-xs lg:text-sm font-semibold text-muted-foreground">
                        from
                      </span>
                      <ProfilePicture
                        imageURL={milestone.grantReceived.communityImage}
                        name={milestone.grantReceived.communityName || "Community"}
                        size="20"
                        className="h-5 w-5 lg:h-6 lg:w-6 min-w-5 min-h-5 lg:min-w-6 lg:min-h-6 rounded-full"
                        alt={milestone.grantReceived.communityName || "Community"}
                      />
                      <span className="text-xs lg:text-sm font-semibold text-foreground">
                        {milestone.grantReceived.communityName ||
                          milestone.grantReceived.grantTitle}
                      </span>
                    </div>

                    {/* Right side: Date only */}
                    <div className="flex flex-row items-center gap-1.5 lg:gap-2 text-xs lg:text-sm font-medium leading-5 text-muted-foreground">
                      <span>{formatDisplayDate(milestone.createdAt)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Left side: Status and Due Date */}
                    <div className="flex flex-row items-center gap-1.5 lg:gap-2 flex-wrap">
                      <span className="text-xs lg:text-sm font-semibold text-foreground">
                        {getActivityTypeLabel(milestone.type)}
                      </span>
                      {isValidTimestamp(milestone.endsAt) && (
                        <span className="text-xs lg:text-sm font-semibold text-muted-foreground">
                          Due by{" "}
                          {formatDisplayDate(new Date(milestone.endsAt! * 1000).toISOString())}
                        </span>
                      )}
                    </div>

                    {/* Posted by - stacks on mobile */}
                    {(() => {
                      const attester = getMilestoneAttester(milestone);
                      return (
                        <div className="flex flex-row items-center gap-1.5 lg:gap-2 text-xs lg:text-sm font-medium leading-5 text-muted-foreground">
                          <span>Posted {formatDisplayDate(milestone.createdAt)}</span>
                          {attester && (
                            <>
                              <span>by</span>
                              <EthereumAddressToENSAvatar
                                address={attester}
                                className="h-5 w-5 lg:h-6 lg:w-6 min-h-5 min-w-5 lg:min-h-6 lg:min-w-6 rounded-full"
                              />
                              <span className="text-xs lg:text-sm font-semibold leading-5 text-foreground">
                                <EthereumAddressToENSName address={attester} />
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Activity Card - skip for grant_received as the header contains all info */}
              {milestone.type !== "grant_received" && (
                <ActivityCard
                  activity={{
                    type: "milestone",
                    data: milestone,
                  }}
                  isAuthorized={isAuthorized}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline end dot - aligned with line */}
      <div className="absolute left-[10px] max-lg:left-[8px] bottom-0 w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-zinc-600" />
    </div>
  );
}
