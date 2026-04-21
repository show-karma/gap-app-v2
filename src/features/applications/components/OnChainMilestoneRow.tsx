"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import { formatDate } from "@/utilities/formatDate";
import { useCompleteOnChainMilestone } from "../hooks/use-complete-on-chain-milestone";

const MilestoneAIEvaluationBadge = dynamic(
  () =>
    import("@/components/Milestone/MilestoneAIEvaluationBadge").then(
      (m) => m.MilestoneAIEvaluationBadge
    ),
  { ssr: false }
);

export const isOnChainMilestoneCompleted = (m: GrantMilestoneWithCompletion) =>
  !!m.completionDetails || m.status === "completed" || m.status === "verified";

export const isOnChainMilestoneVerified = (m: GrantMilestoneWithCompletion) =>
  !!m.verificationDetails || m.status === "verified";

interface OnChainMilestoneRowProps {
  milestone: GrantMilestoneWithCompletion;
  projectUID: string;
  programId: string;
  isEditable: boolean;
}

export function OnChainMilestoneRow({
  milestone,
  projectUID,
  programId,
  isEditable,
}: OnChainMilestoneRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [reason, setReason] = useState("");
  const { completeMilestone, isPending, completingUID } = useCompleteOnChainMilestone({
    projectUID,
    programId,
  });

  const isCompleted = isOnChainMilestoneCompleted(milestone);
  const isVerified = isOnChainMilestoneVerified(milestone);
  const isRowSubmitting = isPending && completingUID === milestone.uid;

  const handleSubmit = async () => {
    try {
      await completeMilestone({ milestone, reason: reason.trim() });
      setIsEditing(false);
      setReason("");
    } catch {
      // toast surfaced by the hook
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setReason("");
  };

  const canEdit = isEditable && !isCompleted;

  return (
    <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-800/50 p-4">
      <div className="space-y-2">
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-medium">{milestone.title}</h4>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isVerified && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Verified
              </span>
            )}
            {isCompleted && !isVerified && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Completed
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

        {isCompleted && milestone.completionDetails?.description && (
          <div className="mt-3 space-y-1 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold">Completion note</p>
              <MilestoneAIEvaluationBadge milestoneUID={milestone.uid} />
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 prose prose-sm dark:prose-invert max-w-none">
              <MarkdownPreview source={milestone.completionDetails.description} />
            </div>
            {milestone.completionDetails.completedAt && (
              <p className="text-xs text-zinc-400">
                Completed: {formatDate(milestone.completionDetails.completedAt)}
              </p>
            )}
          </div>
        )}

        {canEdit && isEditing && (
          <div className="mt-3 space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-sm font-medium">Completion note (optional)</p>
            <Textarea
              placeholder="Describe what was delivered for this milestone..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-y"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                isLoading={isRowSubmitting}
                disabled={isRowSubmitting}
              >
                {isRowSubmitting ? "Completing..." : "Complete on-chain"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isRowSubmitting}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {canEdit && !isEditing && (
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <Button size="sm" onClick={() => setIsEditing(true)}>
              Mark as complete (gasless)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
