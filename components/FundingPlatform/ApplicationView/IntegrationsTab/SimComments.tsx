"use client";

import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { type FC, memo, useMemo, useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { useSimocracyComments } from "@/hooks/useApplicationIntegrations";
import type { SimocracyCommentRow } from "@/services/fundingApplicationIntegrations.service";
import { cn } from "@/utilities/tailwind";

// Long comments collapse to three lines with a Show more/less toggle, matching
// the sim-evaluation reasoning treatment in CouncilEvaluations.
const CLAMP_MIN_CHARS = 180;
const CLAMP_MIN_LINES = 3;

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

const CommentItem: FC<{ node: CommentNode; depth: number }> = memo(({ node, depth }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong =
    node.text.length > CLAMP_MIN_CHARS || node.text.split("\n").length > CLAMP_MIN_LINES;

  return (
    <div className={depth > 0 ? "mt-3 border-l border-gray-200 pl-4 dark:border-gray-700" : ""}>
      <div className="rounded-lg border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between gap-2">
          <span
            className={
              node.authorName
                ? "text-sm font-semibold text-gray-900 dark:text-white"
                : "font-mono text-xs text-gray-500 dark:text-gray-400"
            }
            title={node.authorDid}
          >
            {node.authorName ?? shortenDid(node.authorDid)}
          </span>
          {node.createdAt && (
            <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
              {formatDate(node.createdAt)}
            </span>
          )}
        </div>
        <div
          className={cn(
            "mt-1.5 break-words text-sm leading-relaxed text-gray-700 dark:text-gray-300",
            !expanded && isLong && "max-h-24 overflow-hidden"
          )}
        >
          <MarkdownPreview variant="inline" source={node.text} />
        </div>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className="mt-2 text-xs font-medium text-gray-500 transition-colors duration-150 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
      {node.replies.map((reply) => (
        <CommentItem key={reply.commentUri} node={reply} depth={depth + 1} />
      ))}
    </div>
  );
});
CommentItem.displayName = "CommentItem";

export const SimComments: FC<{ referenceNumber: string }> = ({ referenceNumber }) => {
  const { data } = useSimocracyComments(referenceNumber);
  const threads = useMemo(() => buildThreads(data?.comments ?? []), [data?.comments]);

  // Hidden entirely when the viewer lacks access or there is nothing to show.
  if (!data || data.forbidden || threads.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Deliberation comments
        </h3>
      </div>
      <div className="space-y-3">
        {threads.map((node) => (
          <CommentItem key={node.commentUri} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
};

export default SimComments;
