"use client";

import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/src/components/navigation/Link";
import type { MilestoneStatusEntry } from "@/types/whitelabel-entities";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";
import { useSubmitMilestoneCompletion } from "../hooks/use-submit-milestone-completion";
import {
  isMilestoneCompleted,
  isMilestoneLate,
  isMilestoneVerified,
} from "../lib/milestone-status";

interface OnChainMilestoneRowProps {
  /**
   * Pre-merged `application.milestoneStatuses[]` entry (source: "project").
   * The milestone exists in `grant.milestones[]` but not in
   * `applicationData` — it's inherited from the linked project and
   * surfaced here so the application page renders one unified list.
   */
  entry: MilestoneStatusEntry;
  /** Application reference number — required so polling can key the indexer lookup. */
  referenceNumber: string;
  isEditable: boolean;
  /**
   * Project UID — used by the "View on project page" link in the
   * "Why am I seeing this?" popover. The entry itself doesn't carry
   * this because the indexer keys milestones by `grantUID` (the
   * project is upstream).
   */
  projectUid: string;
}

/**
 * Renders a milestone that lives on-chain via `grant.milestones[]` but is
 * NOT mirrored in `applicationData` (i.e. inherited from the linked
 * project). The submit flow is the same EOA path as application-source
 * rows — the indexer publishes both into `milestoneStatuses[]`, so the
 * standard application poll covers refresh.
 */
export function OnChainMilestoneRow({
  entry,
  referenceNumber,
  isEditable,
  projectUid,
}: OnChainMilestoneRowProps) {
  const {
    submit: submitCompletion,
    isPending: isSubmittingCompletion,
    isPendingFor: isSubmittingTitle,
  } = useSubmitMilestoneCompletion();

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");

  const isVerified = isMilestoneVerified(entry);
  const isCompleted = isMilestoneCompleted(entry) && !isVerified;
  const isLate = isMilestoneLate(entry);
  // Project-source rows always have a milestoneUID (the indexer only
  // emits them from grant.milestones[], which by construction has UIDs).
  const canEdit = isEditable && !isVerified && !!entry.milestoneUID;
  const isWaitingForIndexer = isSubmittingTitle(entry.milestoneUID, entry.title);

  const completionEntry = entry.completed ?? null;
  const verifiedEntry = entry.verified ?? null;

  const handleStartEdit = () => {
    setEditedText(completionEntry?.reason || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText("");
  };

  const isSubmitEnabled = editedText.trim().length > 0;

  const handleSubmit = async () => {
    if (!entry.milestoneUID) return;
    try {
      await submitCompletion({
        milestoneTitle: entry.title,
        milestoneUID: entry.milestoneUID,
        statusEntry: entry,
        proofOfWork: editedText,
        referenceNumber,
        invoiceFile: null,
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
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium">{entry.title}</h4>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Why am I seeing this milestone?"
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <InformationCircleIcon className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="text-sm">
                <p className="font-semibold mb-1">Why am I seeing this?</p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  This milestone wasn&apos;t part of the original application but is tracked on the
                  project. You can review and complete it from here.
                </p>
                <Link
                  href={PAGES.PROJECT.MILESTONES_AND_UPDATES(projectUid, entry.grantUID)}
                  className="mt-2 inline-block text-primary hover:underline"
                >
                  View on project page →
                </Link>
              </PopoverContent>
            </Popover>
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
            ) : isLate ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                Late
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                Pending
              </span>
            )}
            {entry.dueDate && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                Due: {formatDate(entry.dueDate)}
              </span>
            )}
          </div>
        </div>

        {entry.description && (
          <div className="text-sm text-zinc-600 dark:text-zinc-400 prose prose-sm dark:prose-invert max-w-none">
            <MarkdownPreview source={entry.description} />
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
            {completionEntry && (
              <div className="mt-3 space-y-1 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Completion Update</p>
                  {canEdit && (
                    <Button
                      size="icon-sm"
                      onClick={handleStartEdit}
                      aria-label="Edit completion update"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {completionEntry.reason?.trim() ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownPreview source={completionEntry.reason} />
                  </div>
                ) : (
                  <p className="text-sm italic text-zinc-400 dark:text-zinc-500">
                    No completion text
                  </p>
                )}
                {completionEntry.createdAt && (
                  <p className="text-xs text-zinc-400">
                    Last updated: {formatDate(completionEntry.createdAt)}
                  </p>
                )}
                {isVerified && verifiedEntry && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-md">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                      Verification
                    </p>
                    {verifiedEntry.reason && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {verifiedEntry.reason}
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">
                      Verified by: {verifiedEntry.attester}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!completionEntry && canEdit && (
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
