"use client";

import { CheckCircleIcon, NoSymbolIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { type FC, memo, useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
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
import {
  useApproveSimocracyVerdict,
  useDismissSimocracyVerdict,
} from "@/hooks/useSimocracyMilestoneVerdicts";
import type {
  SimocracyMilestoneVerdictRow,
  SimocracyVerdictPublishBlocker,
} from "@/services/fundingApplicationIntegrations.service";
import { EvaluationFeedback } from "./EvaluationFeedback";
import { SimAuthor, SimTag } from "./SimIdentity";

export interface VerdictFeedbackContext {
  referenceNumber: string;
  viewerAddresses: Set<string>;
  canGiveFeedback: (simUri: string) => boolean;
}

const BLOCKER_REASON: Record<SimocracyVerdictPublishBlocker, string> = {
  already_published: "Already published",
  publishing: "Another reviewer is publishing this verdict",
  dismissed: "Dismissed",
  not_sim_owner: "Only this Sim's owner, a community admin or staff can publish or dismiss it",
};

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

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
  if (verdict.status === "dismissed") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
      >
        <NoSymbolIcon className="h-3.5 w-3.5" />
        Dismissed · rev {verdict.revision}
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

const DismissedNote: FC<{ verdict: SimocracyMilestoneVerdictRow }> = ({ verdict }) => {
  const by = verdict.dismissedBy ? ` by ${shortAddress(verdict.dismissedBy)}` : "";
  const on = verdict.dismissedAt ? ` on ${formatDate(verdict.dismissedAt)}` : "";
  return (
    <p className="mt-3 text-right text-xs text-gray-500 dark:text-gray-400">
      Set aside{by}
      {on}. Not on Simocracy; a new revision from the Sim re-opens it.
    </p>
  );
};

interface VerdictCardProps {
  verdict: SimocracyMilestoneVerdictRow;
  avatar: string | null | undefined;
  referenceNumber: string;
  feedback?: VerdictFeedbackContext;
  showMilestone: boolean;
  onActed: (verdictId: string) => void;
}

function cardClassName(status: SimocracyMilestoneVerdictRow["status"]): string {
  if (status === "published") {
    return "rounded-lg border border-green-200 bg-green-50/40 p-3.5 dark:border-green-900/50 dark:bg-green-900/10";
  }
  if (status === "dismissed") {
    return "rounded-lg border border-gray-200 bg-gray-50 p-3.5 dark:border-gray-700 dark:bg-gray-800/40";
  }
  return "rounded-lg border border-amber-200 bg-amber-50/40 p-3.5 dark:border-amber-900/50 dark:bg-amber-900/10";
}

const VerdictCard: FC<VerdictCardProps> = memo(
  ({ verdict, avatar, referenceNumber, feedback, showMilestone, onActed }) => {
    const [confirming, setConfirming] = useState<"publish" | "dismiss" | null>(null);
    const approve = useApproveSimocracyVerdict(referenceNumber);
    const dismiss = useDismissSimocracyVerdict(referenceNumber);
    const revisionPending =
      verdict.publishedRevision !== null &&
      verdict.status !== "published" &&
      verdict.status !== "dismissed";
    const isPublishing = verdict.status === "publishing";
    const isPublished = verdict.status === "published";
    const isDismissed = verdict.status === "dismissed";
    const busy = approve.isPending || dismiss.isPending || isPublishing;
    const act = (kind: "publish" | "dismiss") => {
      setConfirming(null);
      const input = { verdictId: verdict.verdictId, revision: verdict.revision };
      const options = { onSuccess: () => onActed(verdict.verdictId) };
      if (kind === "publish") approve.mutate(input, options);
      else dismiss.mutate(input, options);
    };
    const staleFeedback = verdict.feedback.filter(
      (entry) => entry.revision !== null && entry.revision < verdict.revision
    ).length;

    return (
      <div
        className={cardClassName(verdict.status)}
        data-testid={`pending-verdict-${verdict.verdictId}`}
        aria-busy={isPublishing}
      >
        <SimAuthor
          name={verdict.simName}
          avatar={avatar}
          detail={
            showMilestone && verdict.milestoneTitle
              ? `Milestone: ${verdict.milestoneTitle}`
              : undefined
          }
          trailing={
            <>
              <VerdictBadge verdict={verdict} revisionPending={revisionPending} />
              {verdict.updatedAt && (
                <time
                  dateTime={verdict.updatedAt}
                  className="text-xs text-gray-500 dark:text-gray-400"
                >
                  {formatDate(verdict.updatedAt)}
                </time>
              )}
            </>
          }
        />

        <div className="mt-2.5 break-words text-sm leading-relaxed text-gray-700 dark:text-gray-300">
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

        {isPublished && (
          <p className="mt-3 text-right text-xs text-green-700 dark:text-green-300">
            Now on Simocracy and in the comments below.
          </p>
        )}
        {isDismissed && <DismissedNote verdict={verdict} />}
        {!isPublished && !isDismissed && (
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setConfirming("dismiss")}
              disabled={!verdict.canPublish || busy}
              title={verdict.publishBlocker ? BLOCKER_REASON[verdict.publishBlocker] : undefined}
              className="gap-1.5"
            >
              {dismiss.isPending ? (
                <>
                  <Spinner className="h-3.5 w-3.5" />
                  Dismissing…
                </>
              ) : (
                "Dismiss"
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setConfirming("publish")}
              disabled={!verdict.canPublish || busy}
              title={verdict.publishBlocker ? BLOCKER_REASON[verdict.publishBlocker] : undefined}
              className="gap-1.5"
            >
              {approve.isPending || isPublishing ? (
                <>
                  <Spinner className="h-3.5 w-3.5" />
                  Publishing…
                </>
              ) : (
                "Publish"
              )}
            </Button>
          </div>
        )}
        {!isPublished &&
          !isDismissed &&
          verdict.publishBlocker &&
          verdict.publishBlocker !== "already_published" && (
            <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
              {BLOCKER_REASON[verdict.publishBlocker]}
            </p>
          )}

        <Dialog
          open={confirming === "publish"}
          onOpenChange={(open) => !open && setConfirming(null)}
        >
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
              <Button type="button" variant="outline" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => act("publish")}>
                Yes, publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={confirming === "dismiss"}
          onOpenChange={(open) => !open && setConfirming(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dismiss this Sim verdict?</DialogTitle>
              <DialogDescription>
                Revision {verdict.revision} of {verdict.simName}&apos;s evaluation is set aside and
                never reaches Simocracy. Reviewers still see it here as dismissed. If the Sim runs
                again, the new revision comes back for review.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={() => act("dismiss")}>
                Yes, dismiss
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

// Drafts awaiting a reviewer's decision, plus dismissed ones (private, so this
// is the only place they show). Published verdicts render from the public
// comment list; only rows still ahead of their published revision show here.
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
  const [actedHere, setActedHere] = useState<Set<string>>(() => new Set());
  const pending = verdicts.filter(
    (verdict) =>
      (verdict.status !== "published" || actedHere.has(verdict.verdictId)) &&
      (!milestoneUid || verdict.milestoneUid.toLowerCase() === milestoneUid.toLowerCase())
  );
  const awaiting = pending.filter(
    (verdict) => verdict.status !== "published" && verdict.status !== "dismissed"
  ).length;
  if (pending.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Sim verdicts awaiting review">
      <div className="flex flex-wrap items-center gap-2">
        <SimTag>Sim evaluations</SimTag>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Awaiting your review
        </h3>
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
          onActed={(verdictId) => setActedHere((prev) => new Set(prev).add(verdictId))}
        />
      ))}
    </section>
  );
};
