"use client";

import { CheckCircleIcon, NoSymbolIcon } from "@heroicons/react/24/outline";
import { type FC, memo, type ReactNode, useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useApproveSimocracyVerdict } from "@/hooks/useSimocracyMilestoneVerdicts";
import type {
  SimocracyMilestoneVerdictRow,
  SimocracyVerdictRevision,
} from "@/services/fundingApplicationIntegrations.service";
import { shortAddress } from "@/utilities/shortAddress";
import { cn } from "@/utilities/tailwind";
import { EvaluationFeedback } from "./EvaluationFeedback";
import { SimAuthor } from "./SimIdentity";

export interface VerdictFeedbackContext {
  referenceNumber: string;
  viewerAddresses: Set<string>;
  canGiveFeedback: (simUri: string) => boolean;
}

const NOT_SIM_OWNER_REASON = "Only this Sim's owner, a community admin or staff can publish it";

// Long verdicts collapse to a few lines; the toggle keeps a six-milestone
// application scannable without hiding anything.
const CLAMP_MIN_CHARS = 420;

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const STATUS: Record<SimocracyMilestoneVerdictRow["status"], { dot: string; label: string }> = {
  pending_review: { dot: "bg-amber-500", label: "Pending review" },
  publishing: { dot: "bg-amber-500", label: "Publishing…" },
  published: { dot: "bg-green-500", label: "Published" },
  dismissed: { dot: "bg-gray-400", label: "Dismissed" },
};

const StatusIcon: FC<{ status: SimocracyMilestoneVerdictRow["status"] }> = ({ status }) => {
  if (status === "publishing") return <Spinner className="h-3 w-3" />;
  if (status === "published")
    return <CheckCircleIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />;
  if (status === "dismissed") return <NoSymbolIcon className="h-3.5 w-3.5 text-gray-400" />;
  return <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", STATUS[status].dot)} />;
};

const Pill: FC<{ icon: ReactNode; children: ReactNode }> = ({ icon, children }) => (
  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-200">
    {icon}
    {children}
  </span>
);

// The state of the version on screen, not of the pair: an earlier version
// the Sim replaced is "replaced", whatever the latest one is doing.
const StatusBadge: FC<{
  verdict: SimocracyMilestoneVerdictRow;
  shown: SimocracyVerdictRevision;
}> = ({ verdict, shown }) => {
  const live = verdict.publishedRevision;
  if (shown.revision === live) {
    return (
      <Pill icon={<StatusIcon status="published" />}>
        Live on Simocracy{shown.revision !== verdict.revision && ` · v${verdict.revision} pending`}
      </Pill>
    );
  }
  if (shown.revision !== verdict.revision) {
    if (shown.outcome === "dismissed") {
      return <Pill icon={<StatusIcon status="dismissed" />}>Dismissed</Pill>;
    }
    return (
      <Pill icon={<span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gray-400" />}>
        Replaced by v{verdict.revision}
      </Pill>
    );
  }
  const label =
    verdict.status === "pending_review" && live !== null
      ? `New version · v${live} live`
      : STATUS[verdict.status].label;
  return <Pill icon={<StatusIcon status={verdict.status} />}>{label}</Pill>;
};

function revisionLabel(
  revision: SimocracyVerdictRevision,
  total: number,
  live: number | null
): string {
  const head = `v${revision.revision}`;
  if (revision.revision === live) return `${head} · live on Simocracy`;
  switch (revision.outcome) {
    case "current":
      return revision.revision === total ? `${head} · latest` : head;
    case "published":
      return `${head} · was live${revision.publishedAt ? ` ${formatDate(revision.publishedAt)}` : ""}`;
    case "dismissed":
      return `${head} · dismissed${revision.dismissedAt ? ` ${formatDate(revision.dismissedAt)}` : ""}`;
    default:
      return `${head} · replaced`;
  }
}

const RevisionPicker: FC<{
  revisions: SimocracyVerdictRevision[];
  value: number;
  live: number | null;
  onChange: (revision: number) => void;
}> = ({ revisions, value, live, onChange }) => {
  if (revisions.length <= 1) {
    return <span className="text-xs text-gray-500 dark:text-gray-400">v{value}</span>;
  }
  const latest = revisions[0].revision;
  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger
        aria-label="Verdict version"
        className="h-7 w-auto gap-1 border-gray-200 bg-white px-2 text-xs font-medium shadow-none dark:border-gray-700 dark:bg-zinc-800"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {revisions.map((revision) => (
          <SelectItem key={revision.revision} value={String(revision.revision)} className="text-xs">
            {revisionLabel(revision, latest, live)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const Outcome: FC<{ verdict: SimocracyMilestoneVerdictRow }> = ({ verdict }) => {
  if (verdict.status === "published") {
    return (
      <p className="text-xs text-green-700 dark:text-green-300">
        On Simocracy and on the public application page
        {verdict.publishedAt ? ` since ${formatDate(verdict.publishedAt)}` : ""}.
      </p>
    );
  }
  if (verdict.status === "dismissed") {
    const by = verdict.dismissedBy ? ` by ${shortAddress(verdict.dismissedBy)}` : "";
    const on = verdict.dismissedAt ? ` on ${formatDate(verdict.dismissedAt)}` : "";
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Set aside{by}
        {on}. Never reached Simocracy; a new version from the Sim reopens it.
      </p>
    );
  }
  if (verdict.publishedRevision !== null) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400">
        v{verdict.publishedRevision} is live on Simocracy. Publishing replaces it.
      </p>
    );
  }
  return null;
};

interface ActionsProps {
  verdict: SimocracyMilestoneVerdictRow;
  /** The version on screen; Publish sends this one. */
  revision: number;
  busy: boolean;
  publishing: boolean;
  onPublish: () => void;
}

const Actions: FC<ActionsProps> = ({ verdict, revision, busy, publishing, onPublish }) => {
  const viewingLatest = revision === verdict.revision;
  const isLive = revision === verdict.publishedRevision;
  const canPublish = verdict.mayAct && !isLive && verdict.status !== "publishing";
  const reason = !verdict.mayAct
    ? NOT_SIM_OWNER_REASON
    : isLive
      ? "This version is the one live on Simocracy"
      : undefined;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!verdict.mayAct && (
        <span className="mr-auto text-xs text-gray-500 dark:text-gray-400">{reason}</span>
      )}
      <Button
        type="button"
        size="sm"
        onClick={onPublish}
        disabled={!canPublish || busy}
        title={reason}
        className="gap-1.5"
      >
        {publishing ? (
          <>
            <Spinner className="h-3.5 w-3.5" />
            Publishing…
          </>
        ) : viewingLatest ? (
          "Publish"
        ) : (
          `Publish v${revision}`
        )}
      </Button>
    </div>
  );
};

function viewingNote(
  shown: SimocracyVerdictRevision,
  current: number,
  live: number | null
): string {
  let what = ", replaced by a later run";
  if (shown.revision === live) what = ", the version live on Simocracy";
  else if (shown.outcome === "published") what = ", which was live before";
  else if (shown.outcome === "dismissed")
    what = `, dismissed${shown.dismissedBy ? ` by ${shortAddress(shown.dismissedBy)}` : ""}`;
  return `Viewing v${shown.revision}${what}. The Sim's latest is v${current}.`;
}

interface VerdictCardProps {
  verdict: SimocracyMilestoneVerdictRow;
  avatar: string | null | undefined;
  referenceNumber: string;
  feedback?: VerdictFeedbackContext;
  /** Version to show first; defaults to the Sim's latest. */
  openOn?: number;
}

const CARD = "rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900";

export const VerdictCard: FC<VerdictCardProps> = memo(
  ({ verdict, avatar, referenceNumber, feedback, openOn }) => {
    const [confirming, setConfirming] = useState(false);
    const [viewing, setViewing] = useState<number>(openOn ?? verdict.revision);
    const [expanded, setExpanded] = useState(false);
    const approve = useApproveSimocracyVerdict(referenceNumber);

    const shown =
      verdict.revisions.find((revision) => revision.revision === viewing) ?? verdict.revisions[0];
    const viewingCurrent = shown.revision === verdict.revision;
    const isPublishing = verdict.status === "publishing";
    const pending = verdict.status === "pending_review" || isPublishing;
    const busy = approve.isPending || isPublishing;
    // Publish is offered on any version that is not the live one.
    const showActions = pending || shown.revision !== verdict.publishedRevision;
    const isLong = shown.text.length > CLAMP_MIN_CHARS;
    const bodyId = `verdict-${verdict.verdictId}-v${shown.revision}`;

    const publish = () => {
      setConfirming(false);
      approve.mutate({ verdictId: verdict.verdictId, revision: shown.revision });
    };

    return (
      <article
        className={cn(CARD, verdict.status === "dismissed" && "opacity-75")}
        data-testid={`verdict-${verdict.verdictId}`}
        aria-busy={isPublishing}
      >
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <SimAuthor
            name={verdict.simName}
            avatar={avatar}
            detail={
              shown.submittedAt
                ? `AI evaluation by a Simocracy Sim · ${formatDate(shown.submittedAt)}`
                : undefined
            }
          />
          <div className="flex items-center gap-3">
            <StatusBadge verdict={verdict} shown={shown} />
            <RevisionPicker
              revisions={verdict.revisions}
              value={viewing}
              live={verdict.publishedRevision}
              onChange={setViewing}
            />
          </div>
        </header>

        {!viewingCurrent && (
          <p className="border-y border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
            {viewingNote(shown, verdict.revision, verdict.publishedRevision)}
          </p>
        )}

        <div className="px-4 pb-4 pt-1">
          <div
            id={bodyId}
            className={cn(
              "break-words text-sm leading-relaxed text-gray-700 dark:text-gray-300",
              !expanded &&
                isLong &&
                "max-h-32 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
            )}
          >
            <MarkdownPreview variant="inline" source={shown.text} />
          </div>
          {isLong && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              aria-controls={bodyId}
              className="mt-1 h-auto p-0 text-xs font-medium text-gray-500 hover:text-gray-900 hover:no-underline dark:text-gray-400 dark:hover:text-white"
            >
              {expanded ? "Show less" : "Show more"}
            </Button>
          )}
        </div>

        {feedback && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/60 [&>div]:mt-0 [&>div]:border-0 [&>div]:pt-0">
            <EvaluationFeedback
              key={shown.revision}
              referenceNumber={feedback.referenceNumber}
              subject={{ commentUri: verdict.commentUri }}
              simUri={verdict.simUri}
              canGiveFeedback={feedback.canGiveFeedback(verdict.simUri) || verdict.mayAct}
              viewerAddresses={feedback.viewerAddresses}
              currentRevision={shown.revision}
            />
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-zinc-800">
          <Outcome verdict={verdict} />
          {showActions && (
            <div className="ml-auto">
              <Actions
                verdict={verdict}
                revision={shown.revision}
                busy={busy}
                publishing={approve.isPending || isPublishing}
                onPublish={() => setConfirming(true)}
              />
            </div>
          )}
        </footer>

        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish v{shown.revision} of this Sim verdict?</DialogTitle>
              <DialogDescription>
                v{shown.revision} of {verdict.simName}&apos;s evaluation of &quot;
                {verdict.milestoneTitle ?? "this milestone"}&quot; will be written to the Simocracy
                gathering and shown on the public application page
                {verdict.publishedRevision !== null && `, replacing v${verdict.publishedRevision}`}
                {shown.revision !== verdict.revision && `. v${verdict.revision} stays pending`}.
                Feedback stays private.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={publish}>
                Yes, publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </article>
    );
  }
);
VerdictCard.displayName = "VerdictCard";
