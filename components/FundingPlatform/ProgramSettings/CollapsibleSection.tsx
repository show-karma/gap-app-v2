"use client";

import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { type ReactNode, useState } from "react";
import { cn } from "@/utilities/tailwind";

export type ConfigurationStatus = "configured" | "partial" | "not-configured";

interface CollapsibleSectionProps {
  title: string;
  description: string;
  status: ConfigurationStatus;
  statusText?: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const statusConfig: Record<
  ConfigurationStatus,
  { color: string; bgColor: string; text: string }
> = {
  configured: {
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    text: "Configured",
  },
  partial: {
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    text: "Partially configured",
  },
  "not-configured": {
    color: "text-gray-400 dark:text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    text: "Not configured",
  },
};

export function CollapsibleSection({
  title,
  description,
  status,
  statusText,
  icon,
  children,
  defaultOpen = false,
  className = "",
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all",
        isOpen && "ring-2 ring-blue-500 ring-opacity-50",
        className
      )}
    >
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-4 flex items-center justify-between bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            {icon}
          </div>

          {/* Title & Description */}
          <div className="text-left">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>

        {/* Status & Chevron */}
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium",
              config.bgColor,
              config.color
            )}
          >
            {statusText || config.text}
          </span>
          {isOpen ? (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content - Collapsible */}
      {isOpen && (
        <div className="px-4 py-6 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
}
