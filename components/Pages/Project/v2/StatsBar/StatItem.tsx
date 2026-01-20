"use client";

import {
  BadgeCheckIcon,
  CalendarClockIcon,
  CircleDollarSignIcon,
  CoinsIcon,
  FolderOpenIcon,
  PercentIcon,
} from "lucide-react";
import type React from "react";
import { cn } from "@/utilities/tailwind";

type StatIconType = "received" | "token" | "grants" | "endorsements" | "complete" | "lastUpdate";

interface StatItemProps {
  value: string | number;
  label: string;
  iconType?: StatIconType;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Get the appropriate icon for a stat type.
 * Matches Figma design with specific icons per stat.
 */
function getStatIcon(iconType?: StatIconType): React.ReactNode {
  switch (iconType) {
    case "received":
      return <CircleDollarSignIcon className="h-4 w-4" />;
    case "token":
      return <CoinsIcon className="h-4 w-4" />;
    case "grants":
      return <FolderOpenIcon className="h-4 w-4" />;
    case "endorsements":
      return <BadgeCheckIcon className="h-4 w-4" />;
    case "complete":
      return <PercentIcon className="h-4 w-4" />;
    case "lastUpdate":
      return <CalendarClockIcon className="h-4 w-4" />;
    default:
      return <CircleDollarSignIcon className="h-4 w-4" />;
  }
}

/**
 * StatItem displays a single statistic with value on top and icon + label below.
 * Matches Figma design with neutral color palette and type-specific icons.
 * Used within ProjectStatsBar for displaying project metrics.
 */
export function StatItem({ value, label, iconType, icon, className, onClick }: StatItemProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 flex-1 min-w-[100px] py-2",
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      data-testid="stat-item"
    >
      {/* Value - top */}
      <span
        className="text-lg font-semibold text-neutral-900 dark:text-white tracking-tight"
        data-testid="stat-value"
      >
        {value}
      </span>

      {/* Icon + Label - below */}
      <div className="flex flex-row items-center gap-1.5">
        <span className="text-neutral-400 dark:text-neutral-500">
          {icon || getStatIcon(iconType)}
        </span>
        <span
          className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap"
          data-testid="stat-label"
        >
          {label}
        </span>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="focus:outline-none focus:ring-2 focus:ring-neutral-500 rounded-lg"
      >
        {content}
      </button>
    );
  }

  return content;
}
