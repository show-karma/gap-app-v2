"use client";

import type { FC } from "react";
import { cn } from "@/utilities/tailwind";

export type SubTabId = "application" | "post-approval";

export interface ApplicationSubTabsProps {
  activeTab: SubTabId;
  onTabChange: (tab: SubTabId) => void;
  /** Whether to show the Post Approval tab */
  showPostApproval: boolean;
}

export const ApplicationSubTabs: FC<ApplicationSubTabsProps> = ({
  activeTab,
  onTabChange,
  showPostApproval,
}) => {
  const tabs: { id: SubTabId; label: string }[] = [
    { id: "application", label: "Application" },
    ...(showPostApproval ? [{ id: "post-approval" as SubTabId, label: "Post Approval" }] : []),
  ];

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-700 rounded-lg p-1 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-all",
            activeTab === tab.id
              ? "bg-white dark:bg-zinc-600 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default ApplicationSubTabs;
