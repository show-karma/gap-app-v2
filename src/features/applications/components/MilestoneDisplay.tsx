"use client";

import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import type { MilestoneData } from "@/types/whitelabel-entities";
import { formatDate } from "@/utilities/formatDate";
import { useMilestoneCompletions } from "../hooks/use-milestone-completions";
import { formatFieldLabel, isMarkdownContent, MILESTONE_CORE_FIELDS } from "../lib/milestone-utils";

interface MilestoneDisplayProps {
  milestones: MilestoneData[];
  fieldLabel: string;
  referenceNumber: string;
}

export function MilestoneDisplay({
  milestones,
  fieldLabel,
  referenceNumber,
}: MilestoneDisplayProps) {
  const { isLoading, getCompletion } = useMilestoneCompletions({
    referenceNumber,
    enabled: true,
  });

  if (isLoading) {
    return <div className="text-zinc-500">Loading milestones...</div>;
  }

  return (
    <div className="space-y-3 pl-4">
      {milestones.map((milestone, index) => {
        const completion = getCompletion(fieldLabel, milestone.title);

        const additionalFields = Object.keys(milestone).filter(
          (key) => !MILESTONE_CORE_FIELDS.includes(key) && milestone[key as keyof MilestoneData]
        );

        return (
          <div
            key={`${fieldLabel}-${index}`}
            className="border-l-2 border-zinc-200 dark:border-zinc-700 pl-4 space-y-1"
          >
            <p className="font-medium text-sm">{milestone.title}</p>

            {milestone.description && (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                <MarkdownPreview source={milestone.description} />
              </div>
            )}

            {milestone.dueDate && (
              <p className="text-xs text-zinc-500">Due: {formatDate(milestone.dueDate)}</p>
            )}

            {additionalFields.map((fieldKey) => {
              const fieldValue = milestone[fieldKey as keyof MilestoneData];
              if (!fieldValue) return null;

              const label = formatFieldLabel(fieldKey);
              const shouldRenderAsMarkdown =
                typeof fieldValue === "string" && isMarkdownContent(fieldValue);

              return (
                <div key={fieldKey} className="text-xs">
                  {shouldRenderAsMarkdown ? (
                    <div className="text-zinc-600 dark:text-zinc-400 mt-1">
                      <strong className="block mb-0.5">{label}:</strong>
                      <MarkdownPreview source={String(fieldValue)} />
                    </div>
                  ) : (
                    <p className="text-zinc-700 dark:text-zinc-300">
                      <strong>{label}:</strong> {String(fieldValue)}
                    </p>
                  )}
                </div>
              );
            })}

            {completion && (
              <div className="mt-3 space-y-2 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <p className="text-xs font-semibold">Completion Update</p>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  <MarkdownPreview source={completion.completionText} />
                </div>
                <p className="text-xs text-zinc-400">
                  Last updated: {formatDate(completion.updatedAt)}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
