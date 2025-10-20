"use client";

import { FC } from "react";
import { IApplicationVersion } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { formatDate } from "@/utilities/formatDate";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

interface ApplicationVersionViewerProps {
  version: IApplicationVersion;
  className?: string;
}

// Function to render field value
const renderFieldValue = (value: string | null | undefined,
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
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object" && "title" in parsed[0]) {
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
                        Due: {formatDate(new Date(milestone.dueDate))}
                      </span>
                    )}
                  </div>
                  {milestone.description && (
                    <div className={cn("text-sm text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none", className)}>
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
        <pre className={cn("bg-zinc-50 dark:bg-zinc-800 p-2 rounded text-xs overflow-x-auto", className)}>
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    }
  } catch {
    // Not JSON, continue with regular rendering
  }

  // For text values, check if it's markdown
  if (value.includes("\n") || value.includes("#") || value.includes("*")) {
    return (
      <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
        <MarkdownPreview source={value} className={className}
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
}) => {

  // Get application data from the version
  const getApplicationData = () => {
    // If version has changes, reconstruct the full application data from changedFields
    if (version.diffFromPrevious?.changedFields) {
      const fields = version.diffFromPrevious.changedFields;
      return fields;
    }
    return [];
  };

  const applicationFields = getApplicationData();

  // Check if there's data to display
  if (!applicationFields || applicationFields.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500 dark:text-gray-400", className)}>
        {version.versionNumber === 0
          ? "Initial version data"
          : "No application data available for this version"}
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
            {field.oldValue && field.oldValue !== field.newValue && (
              renderFieldValue(field.oldValue, "text-sm text-red-500 dark:text-red-400 italic line-through")
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