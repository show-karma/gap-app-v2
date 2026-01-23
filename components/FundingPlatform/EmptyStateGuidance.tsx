"use client";

import {
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  LinkIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/utilities/tailwind";

interface SuggestedField {
  icon: React.ElementType;
  label: string;
  type: string;
  description: string;
}

const SUGGESTED_FIELDS: SuggestedField[] = [
  {
    icon: DocumentTextIcon,
    label: "Project Name",
    type: "text",
    description: "Short title for the project",
  },
  {
    icon: DocumentTextIcon,
    label: "Project Description",
    type: "textarea",
    description: "Detailed project overview",
  },
  {
    icon: EnvelopeIcon,
    label: "Email Address",
    type: "email",
    description: "Required for communication",
  },
  {
    icon: CurrencyDollarIcon,
    label: "Funding Amount",
    type: "number",
    description: "Requested funding in USD",
  },
  {
    icon: UserGroupIcon,
    label: "Team Information",
    type: "textarea",
    description: "Team members and roles",
  },
  {
    icon: LinkIcon,
    label: "Project Links",
    type: "url",
    description: "Website, GitHub, social media",
  },
  {
    icon: CalendarIcon,
    label: "Timeline",
    type: "textarea",
    description: "Project milestones and dates",
  },
];

interface EmptyStateGuidanceProps {
  title?: string;
  description?: string;
  showSuggestions?: boolean;
  className?: string;
}

export function EmptyStateGuidance({
  title = "No Form Fields Yet",
  description = "Build your application form by adding fields from the left panel. Here are some common fields to get you started:",
  showSuggestions = true,
  className,
}: EmptyStateGuidanceProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8",
        className
      )}
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
          <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">{description}</p>
      </div>

      {showSuggestions && (
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
            Suggested fields for grant applications:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SUGGESTED_FIELDS.map((field) => {
              const Icon = field.icon;
              return (
                <div
                  key={field.label}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {field.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{field.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            Click field types in the left panel to add them to your form
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Simplified empty state for post-approval forms
 */
export function PostApprovalEmptyState({ className }: { className?: string }) {
  return (
    <EmptyStateGuidance
      title="No Post-Approval Fields Yet"
      description="This form is optional. Add fields to collect additional information from approved applicants, such as bank details, KYC documents, or project setup requirements."
      showSuggestions={false}
      className={className}
    />
  );
}

/**
 * Empty state for reviewers section
 */
export function ReviewersEmptyState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center",
        className
      )}
    >
      <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
        <UserGroupIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No Reviewers Added Yet
      </h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
        Add team members who will help review applications. Reviewers can view applications, leave
        comments, and assist with evaluation.
      </p>
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 max-w-sm mx-auto">
        <p className="text-sm text-purple-700 dark:text-purple-300">
          <strong>Tip:</strong> You can add reviewers using their wallet address or ENS name.
        </p>
      </div>
    </div>
  );
}
