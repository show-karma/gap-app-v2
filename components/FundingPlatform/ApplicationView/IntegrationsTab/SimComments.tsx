"use client";

import { ChevronRightIcon } from "@heroicons/react/20/solid";
import pluralize from "pluralize";
import { type FC, memo, useMemo, useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Button } from "@/components/ui/button";
import {
  useSimocracyComments,
  useSimocracyCouncil,
  useSimocracyProgramSummary,
} from "@/hooks/useApplicationIntegrations";
import {
  useSimocracyApplicationVerdicts,
  useSimocracyMilestoneVerdicts,
} from "@/hooks/useSimocracyMilestoneVerdicts";
import type { SimocracyCommentRow } from "@/services/fundingApplicationIntegrations.service";
import { cn } from "@/utilities/tailwind";
import { EvaluationFeedback } from "./EvaluationFeedback";
import { SimAuthor, SimSectionHeading } from "./SimIdentity";
import { VerdictReview } from "./VerdictReview";
import { SubjectIcon, SubjectTitle } from "./VerdictSubject";
import {
  type CommentSubjectGroup,
  groupCommentsBySubject,
  splitCommentSubject,
} from "./verdictSubjects";

// Long comments collapse to three lines with a Show more/less toggle, matching
// the sim-evaluation reasoning treatment in CouncilEvaluations.
const CLAMP_MIN_CHARS = 180;
const CLAMP_MIN_LINES = 3;

interface MilestoneFilter {
  uid: string;
  title: string;
}

// Verdicts Karma posted carry the milestone uid; comments synced from
// elsewhere are matched on their "Milestone: <title>" line instead.
// Application verdicts never belong to a milestone.
function isAboutMilestone(comment: SimocracyCommentRow, milestone: MilestoneFilter): boolean {
  if (comment.verdictSubject === "application") return false;
  if (comment.milestoneUid)
    return comment.milestoneUid.toLowerCase() === milestone.uid.toLowerCase();
  const { subject } = splitCommentSubject(comment.text, comment.verdictSubject);
  return subject.kind === "milestone" && subject.title === milestone.title;
}

interface CommentFeedbackContext {
  referenceNumber: string;
  viewerAddresses: Set<string>;
  canGiveFeedback: (simUri: string) => boolean;
}

interface CommentNode extends SimocracyCommentRow {
  replies: CommentNode[];
}

// Builds the reply tree: roots (no parent, or parent missing from the set) in
// chronological order, each with its replies nested under it.
function buildThreads(comments: SimocracyCommentRow[]): CommentNode[] {
  const byUri = new Map<string, CommentNode>();
  for (const comment of comments) {
    byUri.set(comment.commentUri, { ...comment, replies: [] });
  }
  const roots: CommentNode[] = [];
  for (const node of byUri.values()) {
    const parent = node.parentCommentUri ? byUri.get(node.parentCommentUri) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

type CommentGroup = CommentSubjectGroup<CommentNode>;

function shortenDid(did: string): string {
  return did.length > 20 ? `${did.slice(0, 12)}…${did.slice(-4)}` : did;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

interface CommentItemProps {
  node: CommentNode;
  depth: number;
  feedback?: CommentFeedbackContext;
  avatars: Map<string, string | null>;
}

const CommentItem: FC<CommentItemProps> = memo(({ node, depth, feedback, avatars }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong =
    node.text.length > CLAMP_MIN_CHARS || node.text.split("\n").length > CLAMP_MIN_LINES;
  const bodyId = `sim-comment-${node.commentUri.split("/").pop()}`;

  return (
    <div className={depth > 0 ? "mt-3 border-l border-gray-200 pl-4 dark:border-gray-700" : ""}>
      <div className="rounded-lg border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-zinc-800">
        {node.authorSimUri ? (
          <SimAuthor
            name={node.authorName ?? "Sim"}
            avatar={avatars.get(node.authorSimUri)}
            trailing={
              node.createdAt && (
                <time
                  dateTime={node.createdAt}
                  className="text-xs text-gray-500 dark:text-gray-400"
                >
                  {formatDate(node.createdAt)}
                </time>
              )
            }
          />
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span
              className="font-mono text-xs text-gray-500 dark:text-gray-400"
              title={node.authorDid}
            >
              {node.authorName ?? shortenDid(node.authorDid)}
            </span>
            {node.createdAt && (
              <time
                dateTime={node.createdAt}
                className="shrink-0 text-xs text-gray-500 dark:text-gray-400"
              >
                {formatDate(node.createdAt)}
              </time>
            )}
          </div>
        )}
        <div
          id={bodyId}
          className={cn(
            "mt-2.5 break-words text-sm leading-relaxed text-gray-700 dark:text-gray-300",
            !expanded &&
              isLong &&
              "max-h-28 overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]"
          )}
        >
          <MarkdownPreview variant="inline" source={node.text} />
        </div>
        {isLong && (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-controls={bodyId}
            className="mt-2 h-auto p-0 text-xs font-medium text-gray-500 hover:text-gray-900 hover:no-underline dark:text-gray-400 dark:hover:text-white"
          >
            {expanded ? "Show less" : "Show more"}
          </Button>
        )}
        {feedback && node.authorSimUri && (
          <EvaluationFeedback
            referenceNumber={feedback.referenceNumber}
            subject={{ commentUri: node.commentUri }}
            simUri={node.authorSimUri}
            canGiveFeedback={feedback.canGiveFeedback(node.authorSimUri)}
            viewerAddresses={feedback.viewerAddresses}
          />
        )}
      </div>
      {node.replies.map((reply) => (
        <CommentItem
          key={reply.commentUri}
          node={reply}
          depth={depth + 1}
          feedback={feedback}
          avatars={avatars}
        />
      ))}
    </div>
  );
});
CommentItem.displayName = "CommentItem";

export const SimComments: FC<{
  referenceNumber: string;
  feedback?: CommentFeedbackContext;
  /** Narrows the list to one milestone's verdicts, rendered flat without headings. */
  milestone?: MilestoneFilter;
  /** Reviewer surface: also loads the private drafts awaiting approval. */
  review?: boolean;
}> = ({ referenceNumber, feedback, milestone, review = false }) => {
  const { data, isLoading } = useSimocracyComments(referenceNumber);
  const { data: drafts } = useSimocracyMilestoneVerdicts(referenceNumber, { enabled: review });
  // A milestone-scoped pane only ever shows milestone verdicts.
  const loadApplicationVerdicts = review && !milestone;
  const applicationDrafts = useSimocracyApplicationVerdicts(referenceNumber, {
    enabled: loadApplicationVerdicts,
  });
  // The program summary answers instantly but only lists Sims linked to a
  // reviewer; the council (read live from ATProto, slower) carries every Sim
  // of the gathering and fills in the rest once it arrives.
  const { data: summary } = useSimocracyProgramSummary(data?.programId ?? undefined);
  const { data: council } = useSimocracyCouncil(data?.programId ?? undefined);
  const avatars = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const sim of summary?.sims ?? []) map.set(sim.simUri, sim.avatar);
    for (const sim of council ?? [])
      if (sim.avatar || !map.has(sim.simUri)) map.set(sim.simUri, sim.avatar);
    return map;
  }, [summary?.sims, council]);
  // The desk waits for both lists so the application's group does not pop in
  // above milestones already on screen; a failed application list leaves
  // the milestone verdicts reviewable.
  const applicationSettled =
    !loadApplicationVerdicts || applicationDrafts.isSuccess || applicationDrafts.isError;
  const reviewVerdicts = useMemo(() => {
    if (!review || !drafts || drafts.forbidden || !applicationSettled) return null;
    const application =
      applicationDrafts.data && !applicationDrafts.data.forbidden
        ? applicationDrafts.data.verdicts
        : [];
    return [...application, ...drafts.verdicts];
  }, [review, drafts, applicationSettled, applicationDrafts.data]);
  const groups = useMemo(() => {
    // Verdicts the reviewer sees as cards are not repeated in the thread.
    const covered = new Set((reviewVerdicts ?? []).map((verdict) => verdict.commentUri));
    const comments = (data?.comments ?? []).filter((comment) => !covered.has(comment.commentUri));
    if (!milestone) return groupCommentsBySubject(buildThreads(comments));
    const own = comments.filter((comment) => isAboutMilestone(comment, milestone));
    const threads = buildThreads(own).map((node) => ({
      ...node,
      text: splitCommentSubject(node.text, node.verdictSubject).body,
    }));
    return threads.length > 0
      ? [
          {
            key: `milestone:${milestone.title}`,
            subject: { kind: "milestone" as const, title: milestone.title },
            threads,
          },
        ]
      : [];
  }, [data?.comments, milestone, reviewVerdicts]);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse" data-testid="sim-comments-loading">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-zinc-700" />
        <div className="h-20 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-zinc-800" />
      </div>
    );
  }

  // Hidden when the viewer lacks access to Sim comments.
  if (!data || data.forbidden) {
    return null;
  }

  // Reviewers get the verdict desk; everyone else sees only what is public.
  if (reviewVerdicts) {
    return (
      <div className="space-y-6">
        <VerdictReview
          referenceNumber={referenceNumber}
          verdicts={reviewVerdicts}
          milestoneUid={milestone?.uid}
          avatars={avatars}
          feedback={feedback}
        />
        {groups.length > 0 && (
          <PublishedComments
            groups={groups}
            milestone={milestone}
            feedback={feedback}
            avatars={avatars}
            headed={false}
            title="Public thread"
          />
        )}
      </div>
    );
  }

  return (
    <PublishedComments
      groups={groups}
      milestone={milestone}
      feedback={feedback}
      avatars={avatars}
      headed
    />
  );
};

interface PublishedCommentsProps {
  groups: CommentGroup[];
  milestone?: MilestoneFilter;
  feedback?: CommentFeedbackContext;
  avatars: Map<string, string | null>;
  /** Carry the section heading; false inside the reviewer desk, which has its own. */
  headed: boolean;
  /** Plain label used when the section sits below the reviewer desk. */
  title?: string;
}

const PublishedComments: FC<PublishedCommentsProps> = ({
  groups,
  milestone,
  feedback,
  avatars,
  headed,
  title,
}) => {
  if (groups.length === 0) {
    return (
      <div className="space-y-2">
        {headed && !milestone && <SimSectionHeading title="Sim verdicts" />}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {milestone
            ? "No published Sim evaluations for this milestone yet."
            : "No published Sim evaluations on this application yet."}
        </p>
      </div>
    );
  }

  if (milestone) {
    return (
      <div className="space-y-3">
        {!headed && title && (
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        )}
        {groups[0].threads.map((node) => (
          <CommentItem
            key={node.commentUri}
            node={node}
            depth={0}
            feedback={feedback}
            avatars={avatars}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {headed && <SimSectionHeading title="Sim verdicts" />}
      {!headed && title && (
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      )}
      {groups.map((group) => (
        <details key={group.key} open className="group space-y-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded text-sm font-medium text-gray-900 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-white [&::-webkit-details-marker]:hidden">
            <ChevronRightIcon
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none"
            />
            <SubjectIcon kind={group.subject.kind} />
            <h4 className="min-w-0 text-sm font-medium">
              <SubjectTitle subject={group.subject} />
            </h4>
            <span className="shrink-0 text-xs font-normal text-gray-500 dark:text-gray-400">
              {group.threads.length} {pluralize("Sim verdict", group.threads.length)}
            </span>
          </summary>
          {group.threads.map((node) => (
            <CommentItem
              key={node.commentUri}
              node={node}
              depth={0}
              feedback={feedback}
              avatars={avatars}
            />
          ))}
        </details>
      ))}
    </div>
  );
};
