"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import formatCurrency from "@/utilities/formatCurrency";
import { cn } from "@/utilities/tailwind";
import { StatItem } from "./StatItem";

interface ProjectStatsBarProps {
  grants: number;
  endorsements: number;
  totalReceived?: number;
  tokenPrice?: number;
  completeRate?: number;
  lastUpdate?: Date | string;
  onGrantsClick?: () => void;
  onEndorsementsClick?: () => void;
  className?: string;
}

/**
 * ProjectStatsBar displays project metrics in a horizontal scrollable bar (desktop)
 * or a wrapping grid (mobile).
 *
 * Matches Figma design with:
 * - Card wrapper with border
 * - Type-specific icons for each stat
 * - Desktop: Horizontal scroll with ScrollArea
 * - Mobile: Flex wrap grid
 */
export function ProjectStatsBar({
  grants,
  endorsements,
  totalReceived,
  tokenPrice,
  completeRate,
  lastUpdate,
  onGrantsClick,
  onEndorsementsClick,
  className,
}: ProjectStatsBarProps) {
  const formatLastUpdate = (date: Date | string | undefined): string => {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1d ago";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  // Build stats array with iconType for each - order matches Figma
  const stats: Array<{
    value: string;
    label: string;
    iconType: "received" | "token" | "grants" | "endorsements" | "complete" | "lastUpdate";
    onClick?: () => void;
    key: string;
  }> = [
    // Received comes first if available
    ...(totalReceived !== undefined
      ? [
          {
            value: `$${formatCurrency(totalReceived)}`,
            label: "Received",
            iconType: "received" as const,
            key: "received",
          },
        ]
      : []),
    // Token price second if available
    ...(tokenPrice !== undefined
      ? [
          {
            value: `$${tokenPrice.toFixed(2)}`,
            label: "Token Price",
            iconType: "token" as const,
            key: "token",
          },
        ]
      : []),
    // Grants
    {
      value: formatCurrency(grants),
      label: grants === 1 ? "Grant" : "Grants",
      iconType: "grants" as const,
      onClick: onGrantsClick,
      key: "grants",
    },
    // Endorsements
    {
      value: formatCurrency(endorsements),
      label: endorsements === 1 ? "Endorsement" : "Endorsements",
      iconType: "endorsements" as const,
      onClick: onEndorsementsClick,
      key: "endorsements",
    },
    // Complete rate if available
    ...(completeRate !== undefined
      ? [
          {
            value: `${completeRate}%`,
            label: "Complete Rate",
            iconType: "complete" as const,
            key: "complete",
          },
        ]
      : []),
    // Last update if available
    ...(lastUpdate
      ? [
          {
            value: formatLastUpdate(lastUpdate),
            label: "Last update",
            iconType: "lastUpdate" as const,
            key: "lastUpdate",
          },
        ]
      : []),
  ];

  return (
    <div className={cn("w-full", className)} data-testid="project-stats-bar">
      {/* Card wrapper matching Figma */}
      <div className="py-6 px-4">
        {/* Desktop: Horizontal row with equal spacing */}
        <div className="hidden lg:block">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex flex-row justify-between items-center px-2">
              {stats.map((stat) => (
                <StatItem
                  key={stat.key}
                  value={stat.value}
                  label={stat.label}
                  iconType={stat.iconType}
                  onClick={stat.onClick}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Mobile: Wrapping grid */}
        <div className="lg:hidden">
          <div className="flex flex-row flex-wrap justify-center gap-6">
            {stats.map((stat) => (
              <StatItem
                key={stat.key}
                value={stat.value}
                label={stat.label}
                iconType={stat.iconType}
                onClick={stat.onClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
