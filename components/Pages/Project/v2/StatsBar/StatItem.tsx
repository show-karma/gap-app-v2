"use client";

import {
  BadgeCheckIcon,
  CalendarClockIcon,
  CircleDollarSignIcon,
  CoinsIcon,
  FolderOpenIcon,
} from "lucide-react";
import type React from "react";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { cn } from "@/utilities/tailwind";

type StatIconType = "received" | "token" | "grants" | "endorsements" | "lastUpdate";

interface StatItemProps {
  value: string | number;
  label: string;
  iconType?: StatIconType;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  tooltip?: string;
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
export function StatItem({
  value,
  label,
  iconType,
  icon,
  className,
  onClick,
  tooltip,
}: StatItemProps) {
  const isClickable = !!onClick;

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 flex-1 min-w-[120px] py-2 px-4 rounded-lg transition-all duration-150",
        isClickable && ["cursor-pointer", "hover:bg-neutral-100 dark:hover:bg-zinc-700/50"],
        className
      )}
      data-testid="stat-item"
    >
      {/* Value - top */}
      <span
        className={cn(
          "text-2xl font-bold tracking-tight transition-colors",
          isClickable
            ? "text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400"
            : "text-neutral-900 dark:text-white"
        )}
        data-testid="stat-value"
      >
        {value}
      </span>

      {/* Icon + Label - below */}
      <div className="flex flex-row items-center gap-1.5">
        <span
          className={cn(
            "transition-colors",
            isClickable
              ? "text-neutral-500 dark:text-neutral-400 group-hover:text-blue-500 dark:group-hover:text-blue-400"
              : "text-neutral-500 dark:text-neutral-400"
          )}
        >
          {icon || getStatIcon(iconType)}
        </span>
        <span
          className={cn(
            "text-sm whitespace-nowrap font-normal transition-colors",
            isClickable
              ? "text-neutral-500 dark:text-neutral-400 group-hover:text-blue-500 dark:group-hover:text-blue-400"
              : "text-neutral-500 dark:text-neutral-400"
          )}
          data-testid="stat-label"
        >
          {label}
        </span>
        {tooltip && (
          <InfoTooltip content={tooltip} side="top" triggerAsChild>
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-help"
              aria-label="More information"
            >
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
                className="text-gray-400"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>
          </InfoTooltip>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}: ${value}`}
        className="group flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
      >
        {content}
      </button>
    );
  }

  return content;
}
