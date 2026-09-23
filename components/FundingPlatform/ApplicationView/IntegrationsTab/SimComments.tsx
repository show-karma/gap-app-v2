"use client";

import { ChatBubbleLeftRightIcon, CpuChipIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { type FC, memo, type ReactNode, useMemo, useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { Button } from "@/components/ui/button";
import { useSimocracyComments, useSimocracyCouncil } from "@/hooks/useApplicationIntegrations";
import type { SimocracyCommentRow } from "@/services/fundingApplicationIntegrations.service";
import { cn } from "@/utilities/tailwind";
import { EvaluationFeedback } from "./EvaluationFeedback";

// Long comments collapse to three lines with a Show more/less toggle, matching
// the sim-evaluation reasoning treatment in CouncilEvaluations.
const CLAMP_MIN_CHARS = 180;
const CLAMP_MIN_LINES = 3;

export interface MilestoneFilter {
  uid: string;
  title: string;
}

// Verdicts Karma posted carry the milestone uid; comments synced from
// elsewhere are matched on their "Milestone: <title>" line instead.
function isAboutMilestone(comment: SimocracyCommentRow, milestone: MilestoneFilter): boolean {
  if (comment.milestoneUid)
    return comment.milestoneUid.toLowerCase() === milestone.uid.toLowerCase();
  return splitMilestone(comment.text).milestone === milestone.title;
}

export interface CommentFeedbackContext {
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

// Milestone evaluations open with a "Milestone: <title>" line (Sims post one
// comment per milestone); everything else is round deliberation. The line is
// lifted into the section heading and dropped from the body.
const MILESTONE_LINE = /^Milestone:\s*(.+)$/;

function splitMilestone(text: string): { milestone: string | null; body: string } {
  const lines = text.split("\n");
  for (let i = 0; i < Math.min(2, lines.length); i++) {
    const match = MILESTONE_LINE.exec(lines[i].trim());
    if (match) {
      return {
        milestone: match[1].trim(),
        body: [...lines.slice(0, i), ...lines.slice(i + 1)].join("\n").trim(),
      };
    }
  }
  return { milestone: null, body: text };
}

interface CommentGroup {
  milestone: string | null;
  threads: CommentNode[];
}

function groupByMilestone(threads: CommentNode[]): CommentGroup[] {
  const groups = new Map<string | null, CommentNode[]>();
  for (const node of threads) {
    const { milestone, body } = splitMilestone(node.text);
    const bucket = groups.get(milestone);
    const entry = milestone ? { ...node, text: body } : node;
    if (bucket) bucket.push(entry);
    else groups.set(milestone, [entry]);
  }
  const milestones = [...groups.entries()]
    .filter(([key]) => key !== null)
    .map(([milestone, nodes]) => ({ milestone, threads: nodes }));
  const deliberation = groups.get(null);
  return deliberation ? [...milestones, { milestone: null, threads: deliberation }] : milestones;
}

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

const SimAvatar: FC<{ avatar: string | null | undefined; name: string }> = ({ avatar, name }) =>
  avatar ? (
    <ProfilePicture
      imageURL={avatar}
      name={name}
      size="32"
      className="h-8 w-8 shrink-0 rounded-md [image-rendering:pixelated]"
      alt=""
    />
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-gray-400">
      <CpuChipIcon className="h-5 w-5" />
    </span>
  );

const CommentItem: FC<CommentItemProps> = memo(({ node, depth, feedback, avatars }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong =
    node.text.length > CLAMP_MIN_CHARS || node.text.split("\n").length > CLAMP_MIN_LINES;
  const bodyId = `sim-comment-${node.commentUri.split("/").pop()}`;

  return (
    <div className={depth > 0 ? "mt-3 border-l border-gray-200 pl-4 dark:border-gray-700" : ""}>
      <div className="rounded-lg border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            {node.authorSimUri && (
              <SimAvatar avatar={avatars.get(node.authorSimUri)} name={node.authorName ?? "Sim"} />
            )}
            <span
              className={
                node.authorName
                  ? "truncate text-sm font-semibold text-gray-900 dark:text-white"
                  : "font-mono text-xs text-gray-500 dark:text-gray-400"
              }
              title={node.authorDid}
            >
              {node.authorName ?? shortenDid(node.authorDid)}
            </span>
          </div>
          {node.createdAt && (
            <time
              dateTime={node.createdAt}
              className="shrink-0 text-xs text-gray-500 dark:text-gray-400"
            >
              {formatDate(node.createdAt)}
            </time>
          )}
        </div>
        <div
          id={bodyId}
          className={cn(
            "mt-1.5 break-words text-sm leading-relaxed text-gray-700 dark:text-gray-300",
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

const SectionHeading: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2">
    <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{children}</h3>
  </div>
);

export const SimComments: FC<{
  referenceNumber: string;
  feedback?: CommentFeedbackContext;
  /** Narrows the list to one milestone's verdicts, rendered flat without headings. */
  milestone?: MilestoneFilter;
}> = ({ referenceNumber, feedback, milestone }) => {
  const { data, isLoading } = useSimocracyComments(referenceNumber);
  // The council carries every Sim of the gathering (the program summary only
  // lists the ones linked to a reviewer), so avatars come from it.
  const { data: council } = useSimocracyCouncil(data?.programId ?? undefined);
  const avatars = useMemo(
    () => new Map<string, string | null>((council ?? []).map((sim) => [sim.simUri, sim.avatar])),
    [council]
  );
  const groups = useMemo(() => {
    const comments = data?.comments ?? [];
    if (!milestone) return groupByMilestone(buildThreads(comments));
    const own = comments.filter((comment) => isAboutMilestone(comment, milestone));
    const threads = buildThreads(own).map((node) => ({
      ...node,
      text: splitMilestone(node.text).body,
    }));
    return threads.length > 0 ? [{ milestone: milestone.title, threads }] : [];
  }, [data?.comments, milestone]);

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

  if (groups.length === 0) {
    return (
      <div className="space-y-2">
        {!milestone && <SectionHeading>Sim comments</SectionHeading>}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {milestone
            ? "No Sim evaluations for this milestone yet."
            : "No Sim comments on this application yet."}
        </p>
      </div>
    );
  }

  if (milestone) {
    return (
      <div className="space-y-3">
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
      <SectionHeading>Sim comments</SectionHeading>
      {groups.map((group) => (
        <details key={group.milestone ?? "deliberation"} open className="group space-y-3">
          <summary className="flex cursor-pointer list-none items-baseline gap-2 rounded text-sm font-medium text-gray-900 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-white [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden="true"
              className="text-gray-400 transition-transform duration-150 group-open:rotate-90"
            >
              ▸
            </span>
            <h4 className="text-sm font-medium">
              {group.milestone ? `Milestone: ${group.milestone}` : "Round deliberation"}
            </h4>
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              {group.threads.length} {pluralize("comment", group.threads.length)}
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

export default SimComments;
