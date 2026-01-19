"use client";

import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { cn } from "@/utilities/tailwind";

interface HelpTooltipProps {
  content: string | React.ReactNode;
  title?: string;
  className?: string;
  iconClassName?: string;
  position?: "top" | "bottom" | "left" | "right";
}

export function HelpTooltip({
  content,
  title,
  className,
  iconClassName,
  position = "top",
}: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-700 border-x-transparent border-b-transparent",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-700 border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-700 border-y-transparent border-r-transparent",
    right:
      "right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-700 border-y-transparent border-l-transparent",
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
        aria-label={title ? `Help: ${title}` : "Help"}
      >
        <QuestionMarkCircleIcon className={cn("w-4 h-4", iconClassName)} />
      </button>

      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-[9999] w-64 p-3 text-sm rounded-lg shadow-lg",
            "bg-gray-900 dark:bg-gray-700 text-white",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            positionClasses[position]
          )}
        >
          {title && <p className="font-semibold mb-1">{title}</p>}
          <div className="text-gray-200 dark:text-gray-300">{content}</div>

          {/* Arrow */}
          <div className={cn("absolute w-0 h-0 border-4", arrowClasses[position])} />
        </div>
      )}
    </div>
  );
}

/**
 * Pre-defined help content for common sections
 */
export const HELP_CONTENT = {
  applicationForm: {
    title: "Application Form",
    content:
      "Define the questions applicants will answer. You need at least one field (including an email field) to enable your program.",
  },
  postApprovalForm: {
    title: "Post-Approval Form",
    content:
      "Collect additional information from approved applicants. This form is optional and shown after an application is approved.",
  },
  reviewers: {
    title: "Reviewers",
    content:
      "Invite team members to help review applications. Reviewers can view applications, leave comments, and help with evaluation.",
  },
  emailTemplates: {
    title: "Email Templates",
    content:
      "Customize the emails sent to applicants when their application is approved or rejected. Use placeholders like {{applicantName}} for dynamic content.",
  },
  aiConfig: {
    title: "AI Evaluation",
    content:
      "Configure AI-powered evaluation to automatically score applications based on your criteria. This helps prioritize and filter applications.",
  },
  programDetails: {
    title: "Program Details",
    content:
      "Basic information about your funding program. This is set when the program is created and can be updated from the main program settings.",
  },
  privacy: {
    title: "Privacy Settings",
    content:
      "Control whether applications are private (only visible to admins and reviewers) or public.",
  },
};

/**
 * Email template placeholders with descriptions
 */
export const EMAIL_PLACEHOLDERS = [
  {
    placeholder: "{{applicantName}}",
    description: "The applicant's name from the application",
  },
  {
    placeholder: "{{applicantEmail}}",
    description: "The applicant's email address",
  },
  {
    placeholder: "{{programName}}",
    description: "Your program's name",
  },
  {
    placeholder: "{{referenceNumber}}",
    description: "Application reference (e.g., APP-12345)",
  },
  {
    placeholder: "{{reason}}",
    description: "Your approval/rejection reason",
  },
  {
    placeholder: "{{dashboardLink}}",
    description: "Link to the applicant's dashboard",
  },
  {
    placeholder: "{{projectTitle}}",
    description: "The project title from the application",
  },
];
