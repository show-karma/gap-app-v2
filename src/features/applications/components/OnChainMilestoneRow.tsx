"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import { formatDate } from "@/utilities/formatDate";
import { useSubmitMilestoneCompletion } from "../hooks/use-submit-milestone-completion";

interface OnChainMilestoneRowProps {
  milestone: GrantMilestoneWithCompletion;
  /** Application reference number — required so polling can key the indexer lookup. */
  referenceNumber: string;
  isEditable: boolean;
  /** Project UID — used both by the SDK attestation and for query invalidation. */
  projectUid: string;
  /** Program ID — narrows the project-grant-milestones invalidation key. */
  programId: string;
  /**
   * Grant UID for this program — required by the on-chain `MilestoneCompleted`
   * attestation. Comes from the same `useProjectGrantMilestones` response that
   * provided the milestone (`response.grant?.uid`); skipping this row is
   * preferable to attempting submission without it.
   */
  grantUID: string;
}

/**
 * Renders a milestone that lives on-chain via `grant.milestones[]` but is
 * NOT mirrored in the application's `applicationData`. The row reuses the
 * EOA submission flow from `useSubmitMilestoneCompletion` — pure on-chain
 * milestones don't have a corresponding `application.milestoneStatuses[]`
 * entry, so the hook's poll will time out softly and the parent's
 * project-grant-milestones invalidation is what actually refreshes the row.
 */
export function OnChainMilestoneRow({
  milestone,
  referenceNumber,
  isEditable,
  projectUid,
  programId,
  grantUID,
}: OnChainMilestoneRowProps) {
  const {
    submit: submitCompletion,
    isPending: isSubmittingCompletion,
    isPendingFor: isSubmittingTitle,
  } = useSubmitMilestoneCompletion();

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");

  const completion = milestone.completionDetails;
  const verification = milestone.verificationDetails;
  const isVerified = !!verification;
  const isCompleted = !!completion && !isVerified;
  const canEdit = isEditable && !isVerified;
  const isWaitingForIndexer = isSubmittingTitle(milestone.title);

  const handleStartEdit = () => {
    setEditedText(completion?.description || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText("");
  };

  const isSubmitEnabled = editedText.trim().length > 0;

  const handleSubmit = async () => {
    if (!milestone.uid) return;
    try {
      await submitCompletion({
        milestoneTitle: milestone.title,
        milestoneUID: milestone.uid,
        // Synthesize a status entry — pure on-chain rows aren't carried in
        // `application.milestoneStatuses`, but the submit hook only reads
        // `chainID` + `grantUID` from this struct. The hook's poll will
        // time out softly (the milestoneUID never lands in milestoneStatuses);
        // invalidation refreshes the row instead.
        statusEntry: {
          milestoneUID: milestone.uid,
          currentStatus: milestone.status,
          grantUID,
          chainID: milestone.chainId,
        },
        proofOfWork: editedText,
        referenceNumber,
        invoiceFile: null,
        projectUid,
        programId,
      });
      setIsEditing(false);
      setEditedText("");
    } catch {
      // hook surfaces errors via toast; keep the form open for retry
    }
  };

  return (
    <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-800/50 p-4">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{milestone.title}</h4>
            <span
              className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              title="Sourced directly from the on-chain grant aggregate"
            >
              On-chain
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isVerified ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Verified
              </span>
            ) : isCompleted ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Completed
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                Pending
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

        {isEditing ? (
          <div className="mt-3 space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-sm font-medium">Add Completion Update</p>
            <Textarea
              placeholder="Enter your completion update for this milestone..."
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={3}
              className="resize-y"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                isLoading={isWaitingForIndexer}
                disabled={!isSubmitEnabled || isSubmittingCompletion || isWaitingForIndexer}
              >
                {isWaitingForIndexer ? "Submitting..." : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isWaitingForIndexer}
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
                    <Button size="icon-sm" onClick={handleStartEdit}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownPreview source={completion.description} />
                </div>
                {completion.completedAt && (
                  <p className="text-xs text-zinc-400">
                    Last updated: {formatDate(completion.completedAt)}
                  </p>
                )}
                {isVerified && verification && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-md">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                      Verification
                    </p>
                    {verification.description && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {verification.description}
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">
                      Verified by: {verification.verifiedBy}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!completion && canEdit && (
              <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <Button size="sm" onClick={handleStartEdit}>
                  Add Completion Update
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
