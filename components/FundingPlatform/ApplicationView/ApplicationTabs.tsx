"use client";

import { Tab, Transition } from "@headlessui/react";
import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { type FC, Fragment, type ReactNode } from "react";
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
  return (
    <Tab.Group defaultIndex={defaultIndex} onChange={onChange}>
      <Tab.List
        className={cn(
          "flex space-x-1 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 px-2 sm:px-4",
          connectedToHeader ? "border-l border-r" : "rounded-t-lg border-l border-r border-t"
        )}
        aria-label="Application sections"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            className={({ selected }) =>
              cn(
                "flex items-center justify-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium outline-none transition-colors",
                "border-b-2 -mb-px focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                selected
                  ? "border-primary text-primary dark:text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
              )
            }
            aria-label={tab.label}
          >
            <tab.icon className="w-5 h-5" aria-hidden="true" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels className="bg-white dark:bg-zinc-800 rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <Tab.Panel key={tab.id} as={Fragment}>
            {({ selected }) => (
              <Transition
                as="div"
                show={selected}
                enter="transition-opacity duration-150 ease-out"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity duration-100 ease-in"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
                className="outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                {tab.content}
              </Transition>
            )}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
};

// Export commonly used icons for convenience
export const TabIcons = {
  Application: DocumentTextIcon,
  AIAnalysis: SparklesIcon,
  Discussion: ChatBubbleLeftRightIcon,
};

export default ApplicationTabs;
