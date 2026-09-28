"use client";

import { ChatBubbleLeftRightIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { UserGroupIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { cn } from "@/utilities/tailwind";

export type ReviewPanelTab = "details" | "comments" | "simocracy";

const TABS = [
  { key: "details", label: "Details", icon: DocumentTextIcon },
  { key: "comments", label: "Comments", icon: ChatBubbleLeftRightIcon },
  { key: "simocracy", label: "Simocracy", icon: UserGroupIcon },
] as const satisfies ReadonlyArray<{
  key: ReviewPanelTab;
  label: string;
  icon: React.ElementType;
}>;

interface ReviewPanelTabsProps {
  active: ReviewPanelTab;
  onChange: (tab: ReviewPanelTab) => void;
}

export function ReviewPanelTabs({ active, onChange }: ReviewPanelTabsProps) {
  return (
    <div className="inline-flex w-max rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <Button
            key={tab.key}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(tab.key)}
            className={cn(
              "h-auto gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              isActive
                ? "bg-white text-gray-950 shadow-sm hover:bg-white dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-950"
                : "text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}
