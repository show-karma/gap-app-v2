"use client";

import { LockClosedIcon, SunIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { cn } from "@/utilities/tailwind";

export type AIAnalysisSubTabId = "external" | "internal";

export interface AIAnalysisSubTabsProps {
  /** Currently active sub-tab */
  activeTab: AIAnalysisSubTabId;
  /** Callback when tab changes */
  onTabChange: (tab: AIAnalysisSubTabId) => void;
}

const tabs: { id: AIAnalysisSubTabId; label: string; icon: typeof SunIcon; description: string }[] =
  [
    {
      id: "external",
      label: "External Evaluation",
      icon: SunIcon,
      description: "Visible to applicants",
    },
    {
      id: "internal",
      label: "Internal Evaluation",
      icon: LockClosedIcon,
      description: "Reviewer only",
    },
  ];

/**
 * Sub-tab navigation for AI Analysis tab.
 * Switches between External (applicant-visible) and Internal (reviewer-only) evaluations.
 */
export const AIAnalysisSubTabs: FC<AIAnalysisSubTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-700 rounded-lg p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
              isActive
                ? "bg-white dark:bg-zinc-600 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4",
                tab.id === "internal" && isActive && "text-purple-600 dark:text-purple-400"
              )}
            />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.id === "external" ? "External" : "Internal"}</span>
          </button>
        );
      })}
    </div>
  );
};

export default AIAnalysisSubTabs;
