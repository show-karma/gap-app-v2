"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utilities/tailwind";

export type ContentTab = "profile" | "updates" | "about" | "funding" | "impact";

interface ContentTabsProps {
  activeTab: ContentTab;
  onTabChange: (tab: ContentTab) => void;
  fundingCount?: number;
  className?: string;
}

/**
 * ContentTabs provides tab navigation for the project profile page.
 * Desktop: Below header
 * Mobile: At very top of page
 */
export function ContentTabs({ activeTab, onTabChange, fundingCount, className }: ContentTabsProps) {
  const tabs: { value: ContentTab; label: string; count?: number }[] = [
    { value: "profile", label: "Profile" },
    { value: "updates", label: "Updates" },
    { value: "about", label: "About" },
    { value: "funding", label: "Funding", count: fundingCount },
    { value: "impact", label: "Impact" },
  ];

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as ContentTab)}
      className={cn("w-full", className)}
      data-testid="content-tabs"
    >
      <TabsList
        className="w-full justify-start bg-transparent border-b border-gray-200 dark:border-zinc-700 rounded-none h-auto p-0 gap-0"
        data-testid="tabs-list"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "relative px-4 py-3 rounded-none bg-transparent shadow-none",
              "text-gray-600 dark:text-gray-400",
              "data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400",
              "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
              "after:bg-transparent data-[state=active]:after:bg-blue-600 dark:data-[state=active]:after:bg-blue-400"
            )}
            data-testid={`tab-${tab.value}`}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 min-w-[20px] px-1.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  data-testid={`tab-${tab.value}-count`}
                >
                  {tab.count}
                </Badge>
              )}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
