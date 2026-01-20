"use client";

import type React from "react";
import { cn } from "@/utilities/tailwind";

interface StatItemProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * StatItem displays a single statistic with value and label.
 * Used within ProjectStatsBar for displaying project metrics.
 */
export function StatItem({ value, label, icon, className, onClick }: StatItemProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-4 py-3 min-w-[120px]",
        "bg-gray-50 dark:bg-zinc-800 rounded-lg",
        onClick && "cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors",
        className
      )}
      data-testid="stat-item"
    >
      <div className="flex flex-row items-center gap-1.5">
        {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
        <span className="text-lg font-bold text-gray-900 dark:text-white" data-testid="stat-value">
          {value}
        </span>
      </div>
      <span
        className="text-xs text-gray-500 dark:text-gray-400 text-center whitespace-nowrap"
        data-testid="stat-label"
      >
        {label}
      </span>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
      >
        {content}
      </button>
    );
  }

  return content;
}
