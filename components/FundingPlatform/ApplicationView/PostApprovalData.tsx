"use client";

import { type FC, useMemo } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { formatDate } from "@/utilities/formatDate";

interface PostApprovalDataProps {
  postApprovalData: Record<string, any>;
  program?: any;
}

const PostApprovalData: FC<PostApprovalDataProps> = ({ postApprovalData, program }) => {
  // Create field labels mapping from program's post-approval schema
  const fieldLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    if (program?.postApprovalFormSchema?.fields) {
      program.postApprovalFormSchema.fields.forEach((field: any) => {
        if (field.id && field.label) {
          labels[field.id] = field.label;
        }
      });
    }
    return labels;
  }, [program]);

  const renderPostApprovalData = () => {
    if (!postApprovalData || Object.keys(postApprovalData).length === 0) {
      return <p className="text-gray-500 dark:text-gray-400">No post-approval data available</p>;
    }

    return (
      <div className="space-y-4">
        {Object.entries(postApprovalData).map(([key, value]) => (
          <div key={key} className="border-b border-gray-100 dark:border-gray-700 pb-3">
            <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {fieldLabels[key] || key.replace(/_/g, " ")}
            </dt>
            <dd className="text-sm text-gray-900 dark:text-gray-100">
              {Array.isArray(value) ? (
                value.length > 0 &&
                value[0] !== null &&
                typeof value[0] === "object" &&
                "title" in value[0] ? (
                  <div className="space-y-2">
                    {value.map((milestone: any, index) => (
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
                            <div className="text-xs text-gray-600 dark:text-gray-400 prose prose-xs dark:prose-invert max-w-none">
                              <MarkdownPreview source={milestone.description} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {value.map((item, index) => (
                      <span
                        key={index}
                        className="inline-block bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs"
                      >
                        {String(item)}
                      </span>
                    ))}
                  </div>
                )
              ) : typeof value === "boolean" ? (
                <span>{value ? "Yes" : "No"}</span>
              ) : typeof value === "object" && value !== null ? (
                <pre className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded text-xs overflow-x-auto">
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownPreview source={String(value)} />
                </div>
              )}
            </dd>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Approval Details</h3>
      {renderPostApprovalData()}
    </div>
  );
};

export default PostApprovalData;
