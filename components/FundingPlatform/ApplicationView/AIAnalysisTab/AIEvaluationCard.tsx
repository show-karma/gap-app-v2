"use client";

import type { FC, ReactNode } from "react";
import { cn } from "@/utilities/tailwind";

export interface AIEvaluationCardProps {
  /** Card title */
  title: string;
  /** Subtitle/description */
  subtitle: string;
  /** Icon to display next to title */
  icon: ReactNode;
  /** Whether this is an internal evaluation (affects styling) */
  isInternal?: boolean;
  /** Action button (e.g., Re-run button) */
  action?: ReactNode;
  /** Card content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export const AIEvaluationCard: FC<AIEvaluationCardProps> = ({
  title,
  subtitle,
  icon,
  isInternal = false,
  action,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-white dark:bg-zinc-800 rounded-lg border",
        isInternal
          ? "border-purple-200 dark:border-purple-800/50"
          : "border-gray-200 dark:border-gray-700",
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-start justify-between gap-4 p-5 border-b",
          isInternal
            ? "border-purple-100 dark:border-purple-800/30 bg-purple-50/50 dark:bg-purple-900/10"
            : "border-gray-100 dark:border-gray-700"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex-shrink-0 p-2 rounded-lg",
              isInternal
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                : "bg-primary/10 text-primary"
            )}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p
              className={cn(
                "text-sm mt-0.5",
                isInternal
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              {subtitle}
            </p>
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {/* Content */}
      <div className="p-5">{children}</div>
    </div>
  );
};

export default AIEvaluationCard;
