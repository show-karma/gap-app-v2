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
 * Desktop: Horizontal scroll with ScrollArea
 * Mobile: Flex wrap grid with min-w-[120px] items
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

  const stats = [
    {
      value: formatCurrency(grants),
      label: grants === 1 ? "Grant" : "Grants",
      onClick: onGrantsClick,
      key: "grants",
    },
    {
      value: formatCurrency(endorsements),
      label: endorsements === 1 ? "Endorsement" : "Endorsements",
      onClick: onEndorsementsClick,
      key: "endorsements",
    },
    ...(totalReceived !== undefined
      ? [
          {
            value: `$${formatCurrency(totalReceived)}`,
            label: "Received",
            key: "received",
          },
        ]
      : []),
    ...(tokenPrice !== undefined
      ? [
          {
            value: `$${tokenPrice.toFixed(2)}`,
            label: "Token",
            key: "token",
          },
        ]
      : []),
    ...(completeRate !== undefined
      ? [
          {
            value: `${completeRate}%`,
            label: "Complete",
            key: "complete",
          },
        ]
      : []),
    ...(lastUpdate
      ? [
          {
            value: formatLastUpdate(lastUpdate),
            label: "Last Update",
            key: "lastUpdate",
          },
        ]
      : []),
  ];

  return (
    <div className={cn("w-full", className)} data-testid="project-stats-bar">
      {/* Desktop: Horizontal scroll */}
      <div className="hidden lg:block">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex flex-row gap-3 p-1">
            {stats.map((stat) => (
              <StatItem
                key={stat.key}
                value={stat.value}
                label={stat.label}
                onClick={stat.onClick}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Mobile: Wrapping grid */}
      <div className="lg:hidden">
        <div className="flex flex-row flex-wrap gap-2">
          {stats.map((stat) => (
            <StatItem
              key={stat.key}
              value={stat.value}
              label={stat.label}
              onClick={stat.onClick}
              className="flex-1"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
