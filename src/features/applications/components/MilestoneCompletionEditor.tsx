"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MilestoneData } from "@/types/whitelabel-entities";
import { formatDate } from "@/utilities/formatDate";
import { useMilestoneCompletions } from "../hooks/use-milestone-completions";
import { formatFieldLabel, isMarkdownContent, MILESTONE_CORE_FIELDS } from "../lib/milestone-utils";

interface MilestoneCompletionEditorProps {
  milestones: MilestoneData[];
  fieldLabel: string;
  communityId: string;
  referenceNumber: string;
  isEditable: boolean;
}

export function MilestoneCompletionEditor({
  milestones,
  fieldLabel,
  communityId,
  referenceNumber,
  isEditable,
}: MilestoneCompletionEditorProps) {
  const {
    isLoading,
    createCompletion,
    updateCompletion,
    isCreating,
    isUpdating,
    getCompletion,
    hasCompletion,
  } = useMilestoneCompletions({
    communityId,
    referenceNumber,
    enabled: true,
  });

  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<Record<string, string>>({});

  const handleStartEdit = (milestoneTitle: string) => {
    const completion = getCompletion(fieldLabel, milestoneTitle);
    setEditingMilestone(milestoneTitle);
    setEditedText({
      ...editedText,
      [milestoneTitle]: completion?.completionText || "",
    });
  };

  const handleCancelEdit = (milestoneTitle: string) => {
    setEditingMilestone(null);
    const newEditedText = { ...editedText };
    delete newEditedText[milestoneTitle];
    setEditedText(newEditedText);
  };

  const handleSubmit = (milestoneTitle: string) => {
    const text = editedText[milestoneTitle] || "";
    const existingCompletion = hasCompletion(fieldLabel, milestoneTitle);

    if (existingCompletion) {
      updateCompletion(
        {
          milestoneFieldLabel: fieldLabel,
          milestoneTitle,
          completionText: text,
        },
        {
          onSuccess: () => setEditingMilestone(null),
        }
      );
    } else {
      createCompletion(
        {
          milestoneFieldLabel: fieldLabel,
          milestoneTitle,
          completionText: text,
        },
        {
          onSuccess: () => setEditingMilestone(null),
        }
      );
    }
  };

  const isSubmitEnabled = (milestoneTitle: string) => {
    const currentText = editedText[milestoneTitle] || "";
    const completion = getCompletion(fieldLabel, milestoneTitle);
    const savedText = completion?.completionText || "";
    return currentText !== savedText;
  };

  if (isLoading) {
    return <div className="text-zinc-500">Loading milestones...</div>;
  }

  return (
    <div className="space-y-3">
      {milestones.map((milestone, index) => {
        const completion = getCompletion(fieldLabel, milestone.title);
        const isEditing = editingMilestone === milestone.title;
        const currentText = editedText[milestone.title] || "";
        const isCompletionVerified = completion?.isVerified || false;
        const canEdit = isEditable && !isCompletionVerified;

        const additionalFields = Object.keys(milestone).filter(
          (key) => !MILESTONE_CORE_FIELDS.includes(key) && milestone[key as keyof MilestoneData]
        );

        return (
          <div
            key={`${fieldLabel}-${milestone.title}-${index}`}
            className="rounded-lg border bg-zinc-50 dark:bg-zinc-800/50 p-4"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <h4 className="font-medium">{milestone.title}</h4>
                <div className="flex items-center gap-2">
                  {isCompletionVerified && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Verified
                    </span>
                  )}
                  {milestone.dueDate && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                      Due: {formatDate(milestone.dueDate)}
                    </span>
                  )}
                </div>
              </div>

              {milestone.description && (
                <div className="text-sm text-zinc-600 dark:text-zinc-400 prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownPreview source={milestone.description} />
                </div>
              )}

              {additionalFields.map((fieldKey) => {
                const fieldValue = milestone[fieldKey as keyof MilestoneData];
                if (!fieldValue) return null;
                const label = formatFieldLabel(fieldKey);
                const shouldRenderAsMarkdown =
                  typeof fieldValue === "string" && isMarkdownContent(fieldValue);

                return (
                  <div key={fieldKey} className="text-sm">
                    {shouldRenderAsMarkdown ? (
                      <div className="text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium block mb-1">{label}:</span>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <MarkdownPreview source={String(fieldValue)} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">{label}:</span> {String(fieldValue)}
                      </p>
                    )}
                  </div>
                );
              })}

              {isEditing ? (
                <div className="mt-3 space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {completion ? "Edit Completion Update" : "Add Completion Update"}
                    </p>
                    {completion && (
                      <p className="text-xs text-zinc-400">
                        Previously updated: {formatDate(completion.updatedAt)}
                      </p>
                    )}
                  </div>
                  <Textarea
                    placeholder="Enter your completion update for this milestone..."
                    value={currentText}
                    onChange={(e) =>
                      setEditedText({
                        ...editedText,
                        [milestone.title]: e.target.value,
                      })
                    }
                    rows={3}
                    className="resize-y"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSubmit(milestone.title)}
                      isLoading={isCreating || isUpdating}
                      disabled={!isSubmitEnabled(milestone.title) || isCreating || isUpdating}
                    >
                      {isCreating || isUpdating ? "Saving..." : completion ? "Update" : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelEdit(milestone.title)}
                      disabled={isCreating || isUpdating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {completion && (
                    <div className="mt-3 space-y-1 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">Completion Update</p>
                        {canEdit && (
                          <Button size="icon-sm" onClick={() => handleStartEdit(milestone.title)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400 prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownPreview source={completion.completionText} />
                      </div>
                      <p className="text-xs text-zinc-400">
                        Last updated: {formatDate(completion.updatedAt)}
                      </p>
                      {isCompletionVerified && completion.verificationComment && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-md">
                          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                            Verification Comment
                          </p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            {completion.verificationComment}
                          </p>
                          {completion.verifiedBy && (
                            <p className="text-xs text-zinc-400 mt-1">
                              Verified by: {completion.verifiedBy}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!completion && canEdit && (
                    <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      <Button size="sm" onClick={() => handleStartEdit(milestone.title)}>
                        Add Completion Update
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
