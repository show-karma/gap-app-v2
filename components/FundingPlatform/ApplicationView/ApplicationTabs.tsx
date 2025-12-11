"use client";

import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { type FC, type ReactNode, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utilities/tailwind";

export interface TabConfig {
  id: string;
  label: string;
  icon: typeof DocumentTextIcon;
  content: ReactNode;
}

export interface ApplicationTabsProps {
  tabs: TabConfig[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
  /** When true, removes top rounding to connect with header above */
  connectedToHeader?: boolean;
}

export const ApplicationTabs: FC<ApplicationTabsProps> = ({
  tabs,
  defaultIndex = 0,
  onChange,
  connectedToHeader = false,
}) => {
  const defaultTab = tabs[defaultIndex]?.id || tabs[0]?.id;
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleValueChange = (value: string) => {
    setActiveTab(value);
    if (onChange) {
      const index = tabs.findIndex((tab) => tab.id === value);
      if (index !== -1) {
        onChange(index);
      }
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleValueChange} className="w-full">
      <TabsList
        className={cn(
          "flex w-full justify-start space-x-1 h-auto p-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 px-2 sm:px-4",
          connectedToHeader
            ? "border-l border-r rounded-none"
            : "rounded-t-lg border-l border-r border-t"
        )}
        aria-label="Application sections"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className={cn(
              "flex items-center justify-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium rounded-none",
              "border-b-2 -mb-px bg-transparent shadow-none",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              "data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:dark:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none",
              "data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700 data-[state=inactive]:hover:border-gray-300 data-[state=inactive]:dark:text-gray-400 data-[state=inactive]:dark:hover:text-gray-200"
            )}
            aria-label={tab.label}
          >
            <tab.icon className="w-5 h-5" aria-hidden="true" />
            <span className="hidden sm:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="bg-white dark:bg-zinc-800 rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="mt-0 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          >
            {tab.content}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
};

// Export commonly used icons for convenience
export const TabIcons = {
  Application: DocumentTextIcon,
  AIAnalysis: SparklesIcon,
  Discussion: ChatBubbleLeftRightIcon,
};

export default ApplicationTabs;
