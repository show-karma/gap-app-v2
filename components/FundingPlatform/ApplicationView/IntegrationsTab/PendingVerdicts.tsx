"use client";

import { CheckCircleIcon, CpuChipIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { type FC, memo, useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useApproveSimocracyVerdict } from "@/hooks/useSimocracyMilestoneVerdicts";
import type {
  SimocracyMilestoneVerdictRow,
  SimocracyVerdictPublishBlocker,
} from "@/services/fundingApplicationIntegrations.service";
import { EvaluationFeedback } from "./EvaluationFeedback";

export interface VerdictFeedbackContext {
  referenceNumber: string;
  viewerAddresses: Set<string>;
  canGiveFeedback: (simUri: string) => boolean;
}

const BLOCKER_REASON: Record<SimocracyVerdictPublishBlocker, string> = {
  already_published: "Already published",
  publishing: "Another reviewer is publishing this verdict",
  not_sim_owner: "Only this Sim's owner, a community admin or staff can publish it",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const AMBER_BADGE =
  "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300";

const VerdictBadge: FC<{ verdict: SimocracyMilestoneVerdictRow; revisionPending: boolean }> = ({
  verdict,
  revisionPending,
}) => {
  if (verdict.status === "published") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300"
      >
        <CheckCircleIcon className="h-3.5 w-3.5" />
        Published · rev {verdict.revision}
      </Badge>
    );
  }
  if (verdict.status === "publishing") {
    return (
      <Badge variant="outline" className={`gap-1.5 ${AMBER_BADGE}`}>
        <Spinner className="h-3 w-3" />
        Publishing…
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={AMBER_BADGE}>
      {revisionPending
        ? `Revision ${verdict.revision} pending`
        : `Awaiting review · rev ${verdict.revision}`}
    </Badge>
  );
};

interface VerdictCardProps {
  verdict: SimocracyMilestoneVerdictRow;
  avatar: string | null | undefined;
  referenceNumber: string;
  feedback?: VerdictFeedbackContext;
  showMilestone: boolean;
  onPublished: (verdictId: string) => void;
}

const VerdictCard: FC<VerdictCardProps> = memo(
  ({ verdict, avatar, referenceNumber, feedback, showMilestone, onPublished }) => {
    const [confirming, setConfirming] = useState(false);
    const approve = useApproveSimocracyVerdict(referenceNumber);
    const revisionPending = verdict.publishedRevision !== null && verdict.status !== "published";
    const isPublishing = verdict.status === "publishing";
    const isPublished = verdict.status === "published";
    const staleFeedback = verdict.feedback.filter(
      (entry) => entry.revision !== null && entry.revision < verdict.revision
    ).length;

    return (
      <div
        className={
          isPublished
            ? "rounded-lg border border-green-200 bg-green-50/40 p-3.5 dark:border-green-900/50 dark:bg-green-900/10"
            : "rounded-lg border border-amber-200 bg-amber-50/40 p-3.5 dark:border-amber-900/50 dark:bg-amber-900/10"
        }
        data-testid={`pending-verdict-${verdict.verdictId}`}
        aria-busy={isPublishing}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            {avatar ? (
              <ProfilePicture
                imageURL={avatar}
                name={verdict.simName}
                size="32"
                className="h-8 w-8 shrink-0 rounded-md [image-rendering:pixelated]"
                alt=""
              />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-gray-400">
                <CpuChipIcon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                {verdict.simName}
              </span>
              {showMilestone && verdict.milestoneTitle && (
                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                  Milestone: {verdict.milestoneTitle}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <VerdictBadge verdict={verdict} revisionPending={revisionPending} />
            {verdict.updatedAt && (
              <time
                dateTime={verdict.updatedAt}
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                {formatDate(verdict.updatedAt)}
              </time>
            )}
          </div>
        </div>

        <div className="mt-2 break-words text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          <MarkdownPreview variant="inline" source={verdict.text} />
        </div>

        {revisionPending && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Revision {verdict.publishedRevision} is live on Simocracy. Approving replaces it.
          </p>
        )}
        {staleFeedback > 0 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {staleFeedback} feedback {pluralize("note", staleFeedback)} from an earlier revision.
          </p>
        )}

        {feedback && (
          <EvaluationFeedback
            referenceNumber={feedback.referenceNumber}
            subject={{ commentUri: verdict.commentUri }}
            simUri={verdict.simUri}
            canGiveFeedback={feedback.canGiveFeedback(verdict.simUri)}
            viewerAddresses={feedback.viewerAddresses}
          />
        )}

        {isPublished ? (
          <p className="mt-3 text-right text-xs text-green-700 dark:text-green-300">
            Now on Simocracy and in the comments below.
          </p>
        ) : (
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setConfirming(true)}
              disabled={!verdict.canPublish || approve.isPending || isPublishing}
              title={verdict.publishBlocker ? BLOCKER_REASON[verdict.publishBlocker] : undefined}
              className="gap-1.5"
            >
              {approve.isPending || isPublishing ? (
                <>
                  <Spinner className="h-3.5 w-3.5" />
                  Publishing…
                </>
              ) : (
                "Approve & publish"
              )}
            </Button>
          </div>
        )}
        {!isPublished &&
          verdict.publishBlocker &&
          verdict.publishBlocker !== "already_published" && (
            <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
              {BLOCKER_REASON[verdict.publishBlocker]}
            </p>
          )}

        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish this Sim verdict?</DialogTitle>
              <DialogDescription>
                {verdict.simName}&apos;s evaluation of &quot;
                {verdict.milestoneTitle ?? "this milestone"}
                &quot; will be written to the Simocracy gathering and shown on the public
                application page. Feedback stays private.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  approve.mutate(
                    { verdictId: verdict.verdictId, revision: verdict.revision },
                    { onSuccess: () => onPublished(verdict.verdictId) }
                  );
                }}
              >
                Publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);
VerdictCard.displayName = "VerdictCard";

interface PendingVerdictsProps {
  referenceNumber: string;
  verdicts: SimocracyMilestoneVerdictRow[];
  avatars: Map<string, string | null>;
  feedback?: VerdictFeedbackContext;
  /** Set when the list is already scoped to one milestone. */
  milestoneUid?: string;
}

// Drafts awaiting a reviewer's approval. Published verdicts render from the
// public comment list; only rows still ahead of their published revision show here.
export const PendingVerdicts: FC<PendingVerdictsProps> = ({
  referenceNumber,
  verdicts,
  avatars,
  feedback,
  milestoneUid,
}) => {
  // A verdict published from this list stays in view with a green badge, so
  // the reviewer sees the result where they clicked; it drops out on the
  // next page load, when the public comment list carries it.
  const [publishedHere, setPublishedHere] = useState<Set<string>>(() => new Set());
  const pending = verdicts.filter(
    (verdict) =>
      (verdict.status !== "published" || publishedHere.has(verdict.verdictId)) &&
      (!milestoneUid || verdict.milestoneUid.toLowerCase() === milestoneUid.toLowerCase())
  );
  const awaiting = pending.filter((verdict) => verdict.status !== "published").length;
  if (pending.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Sim verdicts awaiting review">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Awaiting review</h3>
        {awaiting > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {awaiting} {pluralize("verdict", awaiting)} not yet on Simocracy
          </span>
        )}
      </div>
      {pending.map((verdict) => (
        <VerdictCard
          key={verdict.verdictId}
          verdict={verdict}
          avatar={avatars.get(verdict.simUri)}
          referenceNumber={referenceNumber}
          feedback={feedback}
          showMilestone={!milestoneUid}
          onPublished={(verdictId) => setPublishedHere((prev) => new Set(prev).add(verdictId))}
        />
      ))}
    </section>
  );
};
