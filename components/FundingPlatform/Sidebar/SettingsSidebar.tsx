"use client";

import {
  CheckCircleIcon,
  ChevronLeftIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  DocumentTextIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";
import Link from "next/link";
import { cn } from "@/utilities/tailwind";

export type SidebarTabKey =
  | "build"
  | "settings"
  | "post-approval"
  | "ai-config"
  | "reviewers"
  | "program-details";

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface SidebarItem {
  key: SidebarTabKey;
  label: string;
  icon: React.ElementType;
  required?: boolean;
  description?: string;
}

// Module-level constant to avoid creating new Set on every render
const EMPTY_COMPLETED_STEPS = new Set<SidebarTabKey>();

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: "Setup",
    items: [
      {
        key: "program-details",
        label: "Program Details",
        icon: DocumentTextIcon,
        description: "Basic program information",
      },
      {
        key: "build",
        label: "Application Form",
        icon: WrenchScrewdriverIcon,
        required: true,
        description: "Build the application form",
      },
      {
        key: "post-approval",
        label: "Post-Approval Form",
        icon: CheckCircleIcon,
        description: "Form shown after approval",
      },
    ],
  },
  {
    title: "Team",
    items: [
      {
        key: "reviewers",
        label: "Reviewers",
        icon: UserGroupIcon,
        description: "Manage who reviews applications",
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        key: "settings",
        label: "Email & Privacy",
        icon: Cog6ToothIcon,
        description: "Email templates and privacy settings",
      },
    ],
  },
  {
    title: "Advanced",
    items: [
      {
        key: "ai-config",
        label: "AI Evaluation",
        icon: CpuChipIcon,
        description: "Configure AI-powered evaluation",
      },
    ],
  },
];

interface SettingsSidebarProps {
  activeTab: SidebarTabKey;
  onTabChange: (tab: SidebarTabKey) => void;
  communityId: string;
  programId: string;
  programTitle?: string;
  completedSteps?: Set<SidebarTabKey>;
  className?: string;
}

export function SettingsSidebar({
  activeTab,
  onTabChange,
  communityId,
  programId,
  programTitle,
  completedSteps = EMPTY_COMPLETED_STEPS,
  className,
}: SettingsSidebarProps) {
  return (
    <div
      className={cn(
        "w-64 flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 sticky top-0 self-start min-h-screen overflow-visible",
        className
      )}
    >
      {/* Back button and program title */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Link
          href={`/community/${communityId}/admin/funding-platform`}
          className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-3"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Back to Programs
        </Link>
        {programTitle && (
          <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {programTitle}
          </h2>
        )}
      </div>

      {/* Sidebar navigation sections */}
      <nav className="p-3 space-y-4">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = activeTab === item.key;
                const isCompleted = completedSteps.has(item.key);
                const Icon = item.icon;

                return (
                  <li key={item.key}>
                    <button
                      onClick={() => onTabChange(item.key)}
                      className={cn(
                        "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                        isActive
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                    >
                      <span className="relative flex-shrink-0 mt-0.5">
                        <Icon
                          className={cn(
                            "w-5 h-5",
                            isActive
                              ? "text-blue-600 dark:text-blue-400"
                              : isCompleted
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-400 dark:text-gray-500"
                          )}
                        />
                        {isCompleted && !isActive && (
                          <CheckCircleIcon className="absolute -bottom-1 -right-1 w-3 h-3 text-green-600 dark:text-green-400 bg-gray-50 dark:bg-gray-900 rounded-full" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-medium truncate",
                              isActive ? "text-blue-700 dark:text-blue-300" : ""
                            )}
                          >
                            {item.label}
                          </span>
                          {item.required && (
                            <span className="text-xs text-red-500 dark:text-red-400">*</span>
                          )}
                        </div>
                        {item.description && (
                          <p
                            className={cn(
                              "text-xs mt-0.5 truncate",
                              isActive
                                ? "text-blue-600/70 dark:text-blue-400/70"
                                : "text-gray-500 dark:text-gray-400"
                            )}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Required fields note */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <span className="text-red-500">*</span> Required to enable program
        </p>
      </div>
    </div>
  );
}

export { SIDEBAR_SECTIONS };
export type { SidebarSection, SidebarItem };
