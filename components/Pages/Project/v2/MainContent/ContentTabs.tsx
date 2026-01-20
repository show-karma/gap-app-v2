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
        className="w-full justify-start bg-transparent border-b border-neutral-200 dark:border-zinc-700 rounded-none h-auto p-0 gap-0"
        data-testid="tabs-list"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "relative px-4 py-3 rounded-none bg-transparent shadow-none",
              "text-neutral-600 dark:text-neutral-400 font-medium",
              "data-[state=active]:text-neutral-900 dark:data-[state=active]:text-white",
              "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
              "after:bg-transparent data-[state=active]:after:bg-neutral-900 dark:data-[state=active]:after:bg-white"
            )}
            data-testid={`tab-${tab.value}`}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 min-w-[20px] px-1.5 text-xs bg-neutral-200 dark:bg-zinc-700 text-neutral-700 dark:text-neutral-300"
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
