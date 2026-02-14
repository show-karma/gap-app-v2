"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeftToLine } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { ActivityCard } from "@/components/Shared/ActivityCard";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { useENS } from "@/store/ens";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import formatCurrency from "@/utilities/formatCurrency";
import { cn } from "@/utilities/tailwind";
import type { ActivityFilterType, SortOption } from "./ActivityFilters";

const ITEMS_PER_PAGE = 10;

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

/**
 * Thunder/lightning bolt icon for Project Activity.
 * Matches the design specification for activity updates.
 */
function ThunderIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

/**
 * Money bag icon for Grant Update.
 * Outlined style to match other icons.
 */
function MoneyBagIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.5 2h5l-2.5 4-2.5-4z" />
      <path d="M12 6c-5 0-8 4-8 8 0 5 4 8 8 8s8-3 8-8c0-4-3-8-8-8z" />
      <path d="M12 11v6" />
      <path d="M9.5 14h5" />
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
  return (
    milestone.source.projectMilestone?.attester ||
    milestone.source.projectMilestone?.completed?.attester ||
    milestone.source.grantMilestone?.milestone?.attester ||
    milestone.source.grantMilestone?.milestone?.completed?.attester ||
    milestone.source.grantMilestone?.completionDetails?.completedBy ||
    milestone.projectUpdate?.recipient ||
    milestone.grantUpdate?.attester ||
    milestone.grantUpdate?.recipient
  );
}

/**
 * Get the text label for an activity type.
 * Note: "impact" type should display as "Milestone" to match staging behavior,
 * where project impacts are shown as milestones with the title "Project Impact".
 */
function getActivityTypeLabel(type: string): string {
  switch (type) {
    case "grant_update":
      return "Grant Update";
    case "grant_received":
      return "Grant Received";
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

/**
 * Format grant amount using the same logic as Grant Overview.
 * Handles amounts like "10000 USDC" or plain numbers.
 * Returns null if amount is missing, empty, or zero.
 */
function formatGrantAmount(amount?: string): string | null {
  if (!amount) return null;

  const parts = amount.split(" ");
  const numericPart = parts[0]?.replace(",", "");
  const currencySuffix = parts.length > 1 ? parts.slice(1).join(" ") : null;

  const numAmount = Number(numericPart);
  if (isNaN(numAmount) || numAmount === 0) return null;

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

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isValidTimestamp(timestamp: number | undefined): boolean {
  if (!timestamp || timestamp === 0) return false;
  const date = new Date(timestamp * 1000);
  return date.getFullYear() >= 2000;
}

interface ActivityFeedItemProps {
  milestone: UnifiedMilestone;
  isAuthorized: boolean;
}

const ActivityFeedItem = memo(function ActivityFeedItem({
  milestone,
  isAuthorized,
}: ActivityFeedItemProps) {
  return (
    <div className="relative pl-8 max-lg:pl-7" data-testid="activity-item">
      {/* Timeline icon - positioned relative to item, not content row */}
      <div
        className={cn(
          "absolute left-0 top-0 w-6 h-6 max-lg:w-5 max-lg:h-5 rounded-full border flex items-center justify-center",
          milestone.type === "grant_received" &&
            "border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-400",
          milestone.type === "grant_update" &&
            "border-green-200 bg-green-100 text-green-600 dark:border-green-900/30 dark:bg-green-950/30 dark:text-green-400",
          (milestone.type === "activity" ||
            milestone.type === "update" ||
            milestone.type === "project") &&
            "border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/30 dark:bg-blue-950/30 dark:text-blue-400",
          milestone.type !== "grant_received" &&
            milestone.type !== "grant_update" &&
            milestone.type !== "activity" &&
            milestone.type !== "update" &&
            milestone.type !== "project" &&
            "border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-900/30 dark:bg-orange-950/30 dark:text-orange-400"
        )}
        data-testid="timeline-icon"
      >
        {milestone.type === "grant_received" ? (
          <ArrowLeftToLine className="w-3.5 h-3.5 max-lg:w-3 max-lg:h-3" />
        ) : milestone.type === "grant_update" ? (
          <MoneyBagIcon className="w-3.5 h-3.5 max-lg:w-3 max-lg:h-3" />
        ) : milestone.type === "activity" ||
          milestone.type === "update" ||
          milestone.type === "project" ? (
          <ThunderIcon className="w-3.5 h-3.5 max-lg:w-3 max-lg:h-3" />
        ) : (
          <FlagIcon className="max-lg:scale-90" />
        )}
      </div>

      {/* Status Text, Due Date, and Posted By */}
      <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between lg:gap-2 mb-3">
        {milestone.type === "grant_received" && milestone.grantReceived ? (
          <>
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
              <span className="text-xs lg:text-sm font-semibold text-muted-foreground">from</span>
              <ProfilePicture
                imageURL={milestone.grantReceived.communityImage}
                name={milestone.grantReceived.communityName || "Community"}
                size="20"
                className="h-5 w-5 lg:h-6 lg:w-6 min-w-5 min-h-5 lg:min-w-6 lg:min-h-6 rounded-full"
                alt={milestone.grantReceived.communityName || "Community"}
              />
              <span className="text-xs lg:text-sm font-semibold text-foreground">
                {milestone.grantReceived.communityName || milestone.grantReceived.grantTitle}
              </span>
            </div>

            <div className="flex flex-row items-center gap-1.5 lg:gap-2 text-xs lg:text-sm font-medium leading-5 text-muted-foreground">
              <span>{formatDisplayDate(milestone.createdAt)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-row items-center gap-1.5 lg:gap-2 flex-wrap">
              <span className="text-xs lg:text-sm font-semibold text-foreground">
                {getActivityTypeLabel(milestone.type)}
              </span>
              {isValidTimestamp(milestone.endsAt) && (
                <span className="text-xs lg:text-sm font-semibold text-muted-foreground">
                  Due by {formatDisplayDate(new Date(milestone.endsAt! * 1000).toISOString())}
                </span>
              )}
            </div>

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
});

/**
 * Gap between virtual items in pixels, matching the previous `gap-6` (24px).
 */
const VIRTUAL_ITEM_GAP = 24;

/**
 * ActivityFeed displays a vertical timeline of project activities.
 * Features:
 * - Vertical timeline with colored type-specific icons
 * - Date headers for each item
 * - Activity cards for different types (milestone, update, etc.)
 * - Progressive rendering: shows ITEMS_PER_PAGE at a time, loads more on scroll
 * - Window-based virtualization: only visible items are rendered in the DOM
 */
export function ActivityFeed({
  milestones,
  isAuthorized = false,
  sortBy = "newest",
  activeFilters = [],
  className,
}: ActivityFeedProps) {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const populateEns = useENS((state) => state.populateEns);

  const getFilteredTypes = (filters: ActivityFilterType[]): string[] => {
    const typeMap: Record<ActivityFilterType, string[]> = {
      funding: ["grant", "grant_received"],
      updates: ["activity", "grant_update", "update"],
      blog: ["project"],
      socials: ["impact"],
      other: ["milestone"],
    };

    return filters.flatMap((filter) => typeMap[filter]);
  };

  const getSortTimestamp = (item: UnifiedMilestone): number => {
    if (item.endsAt) return item.endsAt;
    if (item.completed && typeof item.completed === "object" && "createdAt" in item.completed) {
      return Math.floor(new Date(item.completed.createdAt).getTime() / 1000);
    }
    return Math.floor(new Date(item.createdAt).getTime() / 1000);
  };

  const sortedMilestones = useMemo(() => {
    let filtered = [...milestones];

    if (activeFilters.length > 0) {
      const allowedTypes = getFilteredTypes(activeFilters);
      filtered = filtered.filter((milestone) => allowedTypes.includes(milestone.type));
    }

    filtered.sort((a, b) => {
      const timestampA = getSortTimestamp(a);
      const timestampB = getSortTimestamp(b);
      return sortBy === "newest" ? timestampB - timestampA : timestampA - timestampB;
    });

    return filtered;
  }, [milestones, sortBy, activeFilters]);

  // Reset visible count when filters or sort change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [sortBy, activeFilters]);

  const visibleMilestones = useMemo(
    () => sortedMilestones.slice(0, visibleCount),
    [sortedMilestones, visibleCount]
  );
  const hasMore = visibleCount < sortedMilestones.length;

  // Window virtualizer for rendering only visible items
  const virtualizer = useWindowVirtualizer({
    count: visibleMilestones.length,
    estimateSize: () => 400,
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
    gap: VIRTUAL_ITEM_GAP,
  });

  // IntersectionObserver to load more items on scroll
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  // Batch ENS resolution for visible virtual items
  useEffect(() => {
    const virtualItems = virtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;

    const addresses: string[] = [];
    for (const vItem of virtualItems) {
      const milestone = visibleMilestones[vItem.index];
      if (milestone) {
        const attester = getMilestoneAttester(milestone);
        if (attester) {
          addresses.push(attester);
        }
      }
    }
    const unique = [...new Set(addresses)];
    if (unique.length > 0) {
      populateEns(unique);
    }
  }, [virtualizer.getVirtualItems(), visibleMilestones, populateEns]);

  const measureElement = useCallback(
    (node: HTMLElement | null) => {
      if (node) {
        // Defer measurement to next frame to batch all reflows into one
        // instead of triggering a synchronous forced reflow per item
        requestAnimationFrame(() => {
          virtualizer.measureElement(node);
        });
      }
    },
    [virtualizer]
  );

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

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={cn("relative", className)} data-testid="activity-feed">
      {/* Timeline line - centered under icons (w-6=24px, so center at 12px on desktop, w-5=20px so 10px on mobile) */}
      <div className="absolute left-[11px] max-lg:left-[9px] top-2 bottom-0 w-0.5 bg-neutral-200 dark:bg-zinc-700" />

      {/* Virtualized timeline items */}
      <div
        ref={listRef}
        style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
      >
        {virtualItems.map((virtualRow) => {
          const milestone = visibleMilestones[virtualRow.index];
          if (!milestone) return null;
          const uniqueKey = `${milestone.type}-${milestone.uid}-${virtualRow.index}`;
          return (
            <div
              key={uniqueKey}
              data-index={virtualRow.index}
              ref={measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              <ActivityFeedItem milestone={milestone} isAuthorized={isAuthorized} />
            </div>
          );
        })}
      </div>

      {/* Sentinel for infinite scroll */}
      {hasMore && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}

      {/* Timeline end dot - aligned with line */}
      <div className="absolute left-[10px] max-lg:left-[8px] bottom-0 w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-zinc-600" />
    </div>
  );
}
