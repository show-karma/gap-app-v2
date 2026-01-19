"use client";

import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { cn } from "@/utilities/tailwind";
import { EMAIL_PLACEHOLDERS } from "./HelpTooltip";

interface PlaceholderReferenceProps {
  className?: string;
  defaultExpanded?: boolean;
}

export function PlaceholderReference({
  className,
  defaultExpanded = false,
}: PlaceholderReferenceProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={cn(
        "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          Available Placeholders Reference
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 mb-3">
            Use these placeholders in your email templates. They will be automatically replaced with
            actual values when the email is sent.
          </p>
          <div className="space-y-2">
            {EMAIL_PLACEHOLDERS.map((item) => (
              <div key={item.placeholder} className="flex items-start gap-3 text-sm">
                <code className="flex-shrink-0 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded font-mono text-xs">
                  {item.placeholder}
                </code>
                <span className="text-blue-700 dark:text-blue-300 text-xs">{item.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
