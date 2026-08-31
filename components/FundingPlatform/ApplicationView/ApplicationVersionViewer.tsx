"use client";

import { DocumentTextIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import type { IApplicationVersion } from "@/types/funding-platform";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

interface ApplicationVersionViewerProps {
  version: IApplicationVersion;
  className?: string;
  /** Switches the surrounding tab to the full application view. */
  onViewDetails?: () => void;
}

// Function to render field value
const renderFieldValue = (
  value: string | null | undefined,
  className?: string
): React.ReactElement => {
  if (value === null || value === undefined || value === "") {
    return <span className={cn("text-gray-400 italic", className)}>Empty</span>;
  }

  // Check if the value looks like JSON
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object") {
      // Check if it's an array of milestones
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        typeof parsed[0] === "object" &&
        "title" in parsed[0]
      ) {
        return (
          <div className="space-y-2">
            {parsed.map((milestone: any, index: number) => (
              <div
                key={index}
                className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100">
                      {milestone.title}
                    </h5>
                    {milestone.dueDate && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Due: {formatDate(milestone.dueDate)}
                      </span>
                    )}
                  </div>
                  {milestone.description && (
                    <div
                      className={cn(
                        "text-sm text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none",
                        className
                      )}
                    >
                      <MarkdownPreview source={milestone.description} className={className} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }
      // For other arrays or objects, display as JSON
      return (
        <pre
          className={cn(
            "bg-zinc-50 dark:bg-zinc-800 p-2 rounded text-xs overflow-x-auto",
            className
          )}
        >
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    }
  } catch {
    // SUPPRESSED: JSON.parse is a type probe here — non-JSON values are expected
    // and fall through to markdown/text rendering below.
  }

  // For text values, check if it's markdown
  if (value.includes("\n") || value.includes("#") || value.includes("*")) {
    return (
      <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
        <MarkdownPreview
          source={value}
          className={className}
          components={{
            p: (props) => (
              <p className={cn("text-tiny text-foreground-400", className)} {...props} />
            ),
            span: (props) => (
              <span className={cn("text-tiny text-foreground-400", className)} {...props} />
            ),
          }}
        />
      </div>
    );
  }

  return <span className={className}>{value}</span>;
};

const ApplicationVersionViewer: FC<ApplicationVersionViewerProps> = ({
  version,
  className,
  onViewDetails,
}) => {
  // A version only carries the fields that changed against its predecessor, so
  // the initial submission has nothing to diff and renders an explanation.
  const applicationFields = version.diffFromPrevious?.changedFields ?? [];

  const handleViewDetails = () => onViewDetails?.();

  if (applicationFields.length === 0) {
    const isInitialVersion = version.versionNumber === 0;

    return (
      <div
        className={cn(
          "flex flex-col items-center rounded-lg border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700",
          className
        )}
      >
        <DocumentTextIcon
          className="h-10 w-10 text-gray-400 dark:text-gray-600"
          aria-hidden="true"
        />
        <h4 className="mt-3 text-sm font-medium text-gray-900 dark:text-gray-100">
          {isInitialVersion ? "Original submission" : "No changes recorded"}
        </h4>
        <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
          {isInitialVersion
            ? "This is the applicant's first submission, so there is no previous version to compare it against. Every field is original."
            : "This version was recorded without any field-level changes against the previous version."}
        </p>
        {onViewDetails && (
          <button
            type="button"
            onClick={handleViewDetails}
            className="mt-4 inline-flex items-center rounded-md bg-brand-blue px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue/80"
          >
            View application details
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {applicationFields.map((field, index) => (
        <div
          key={index}
          className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0"
        >
          {/* Field label */}
          <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {field.fieldLabel}
          </dt>

          {/* Field values - show old value if different from new value */}
          <dd className="space-y-1 flex flex-col gap-1">
            {/* Old value - show only if it exists and is different from new value */}
            {field.oldValue &&
              field.oldValue !== field.newValue &&
              renderFieldValue(
                field.oldValue,
                "text-sm text-red-500 dark:text-red-400 italic line-through"
              )}

            {/* New value - current value for this version */}
            {renderFieldValue(field.newValue, "text-sm text-zinc-600 dark:text-zinc-400")}
          </dd>
        </div>
      ))}
    </div>
  );
};

export default ApplicationVersionViewer;
