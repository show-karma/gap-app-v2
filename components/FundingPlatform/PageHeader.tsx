"use client";

import type React from "react";
import { cn } from "@/utilities/tailwind";

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Page description explaining the purpose */
  description: string;
  /** Optional icon to display next to the title */
  icon?: React.ElementType;
  /** Optional additional content (e.g., action buttons) */
  actions?: React.ReactNode;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Consistent page header component for tab content pages.
 * Provides title, description, and optional icon/actions for each settings tab.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 pb-6 border-b border-gray-200 dark:border-gray-700", className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">{description}</p>
          </div>
        </div>
        {actions && <div className="flex-shrink-0 ml-4">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * Pre-defined page header content for each tab
 */
export const PAGE_HEADER_CONTENT = {
  programDetails: {
    title: "Program Details",
    description:
      "Configure the basic information about your funding program. This information is displayed publicly to potential applicants.",
  },
  applicationForm: {
    title: "Application Form",
    description:
      "Build the questions applicants will answer when applying to your program. Drag and drop to reorder fields, and mark fields as required or private.",
  },
  postApprovalForm: {
    title: "Post-Approval Form",
    description:
      "Collect additional information from approved applicants. This form is shown after an application is approved and can be used for KYC, payment details, or other follow-up information.",
  },
  reviewers: {
    title: "Reviewers",
    description:
      "Manage who can review applications for your program. Program reviewers can view and evaluate all applications. Milestone reviewers focus on project milestone submissions.",
  },
  emailPrivacy: {
    title: "Email & Privacy Settings",
    description:
      "Configure email notifications, customize approval/rejection templates, set privacy preferences, and manage application access controls.",
  },
  aiEvaluation: {
    title: "AI Evaluation",
    description:
      "Configure AI-powered evaluation to automatically score and analyze applications based on your criteria. This helps prioritize applications and provide consistent feedback.",
  },
} as const;
