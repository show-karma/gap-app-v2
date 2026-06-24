"use client";

import pluralize from "pluralize";
import { memo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { SharedReportCommentNode } from "@/types/donor-research-comments";
import { formatDate } from "@/utilities/formatDate";

const MAX_VISUAL_DEPTH = 4;

interface CommentRowProps {
  node: SharedReportCommentNode;
  depth?: number;
  onReply: (parentId: string) => void;
  /** Bidirectional focus: id of the row whose anchored highlight is currently emphasized. */
  activeCommentId?: string | null;
  /** Click on the row body sets this as the active comment (highlights its anchor in the report). */
  onActivate?: (commentId: string) => void;
  /** Retry a comment whose optimistic POST failed. Optional — only failed rows surface it. */
  onRetry?: (commentId: string) => void;
}

/**
 * Absolute comment timestamp in the viewer's LOCAL timezone, suffixed
 * with "(Local)" so the donor knows it's their own time, not UTC.
 * Composed from the platform's `formatDate` date + time options
 * (the combined datetime option hardcodes a "UTC" label, so we join two).
 */
function formatCommentTimestamp(iso: string): string {
  const date = formatDate(iso, "local", "MMM D, YYYY");
  const d = new Date(iso);
  if (!date || Number.isNaN(d.getTime())) return "";
  // Format the local clock time inline. We deliberately don't use
  // formatDate's "h:mm a" option here: it omits the date for "today" but
  // PREPENDS the full date on other days, which double-prints the date
  // once composed with the date part above.
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${date}, ${h12}:${minutes} ${ampm} (Local)`;
}

const INDENT_CLASS_BY_LEVEL = ["", "pl-4", "pl-8", "pl-12", "pl-16"] as const;

/** Background tint for the comment card: failed > active > default. */
function articleBackgroundClass(node: SharedReportCommentNode, isActive: boolean): string {
  if (node._failed) return "bg-red-50 dark:bg-red-900/20";
  if (isActive) return "bg-amber-50 dark:bg-amber-900/20";
  return "bg-background";
}

interface CommentStatusProps {
  node: SharedReportCommentNode;
  onRetry?: (commentId: string) => void;
}

/** Pending ("Sending…") and failed ("Couldn't send — Retry") affordances. */
const CommentStatus = ({ node, onRetry }: CommentStatusProps) => {
  if (node._optimistic) {
    return <span className="text-muted-foreground">Sending…</span>;
  }
  if (!node._failed) return null;
  return (
    <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
      Couldn&apos;t send
      {onRetry && (
        <button
          type="button"
          className="underline underline-offset-2 hover:no-underline focus-visible:no-underline focus-visible:outline-none"
          onClick={(e) => {
            e.stopPropagation();
            onRetry(node.id);
          }}
        >
          Retry
        </button>
      )}
    </span>
  );
};

function decodeEntities(body: string): string {
  // The backend sanitizer escapes & < > " '. Render those entities as
  // their decoded characters via DOM textContent (which is the React
  // default for string children). React's auto-escape will re-escape
  // for display, so a passed-through &lt; renders as the literal
  // "&lt;" string — that's correct: a donor who typed "<" intended to
  // see "<" rendered.
  return body
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const CommentRowComponent = ({
  node,
  depth = 0,
  onReply,
  activeCommentId,
  onActivate,
  onRetry,
}: CommentRowProps) => {
  const [expanded, setExpanded] = useState(depth < MAX_VISUAL_DEPTH);
  const isActive = activeCommentId === node.id;
  const indentLevel = Math.min(depth, MAX_VISUAL_DEPTH);
  const indentClasses = INDENT_CLASS_BY_LEVEL[indentLevel];

  const showCollapsed = !expanded && node.children.length > 0;
  const visibleChildren = expanded ? node.children : [];
  const decodedBody = decodeEntities(node.body);
  const lines = decodedBody.split(/\n/);

  return (
    <div
      className={`border-l ${isActive ? "border-amber-500" : "border-border/50"} ${indentClasses}`}
    >
      <article
        className={`rounded-md p-3 transition-colors ${articleBackgroundClass(node, isActive)} ${
          node._optimistic ? "opacity-70" : ""
        } ${onActivate ? "cursor-pointer" : ""}`}
        onClick={() => onActivate?.(node.id)}
        onKeyDown={(e) => {
          if (!onActivate) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onActivate(node.id);
          }
        }}
        role={onActivate ? "button" : undefined}
        tabIndex={onActivate ? 0 : undefined}
        aria-current={isActive ? "true" : undefined}
        data-comment-row
        data-active={isActive || undefined}
      >
        <header className="mb-1 text-xs">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {!node.displayName && node._optimistic ? (
              <Skeleton className="h-3 w-20 rounded" />
            ) : (
              <span className="min-w-0 break-words font-medium">{node.displayName}</span>
            )}
            {node.isAdvisor && (
              <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px] uppercase">
                Advisor
              </Badge>
            )}
            <CommentStatus node={node} onRetry={onRetry} />
          </div>
          <time
            className="mt-0.5 block text-muted-foreground"
            dateTime={node.createdAt}
            title={formatCommentTimestamp(node.createdAt)}
          >
            {formatCommentTimestamp(node.createdAt)}
          </time>
        </header>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {lines.map((line, idx) => (
            <span key={idx}>
              {line}
              {idx < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </div>
        <div className="mt-1.5">
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
            onClick={(e) => {
              // Don't bubble into the row's activate handler — the Reply
              // button is its own affordance and shouldn't also flash
              // the highlight.
              e.stopPropagation();
              onReply(node.id);
            }}
          >
            Reply
          </button>
        </div>
      </article>

      {showCollapsed && (
        <button
          type="button"
          className="ml-3 text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => setExpanded(true)}
        >
          Show {pluralize("more reply", node.children.length, true)}
        </button>
      )}

      {visibleChildren.map((child) => (
        <CommentRow
          key={child.id}
          node={child}
          depth={depth + 1}
          onReply={onReply}
          activeCommentId={activeCommentId}
          onActivate={onActivate}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
};

export const CommentRow = memo(CommentRowComponent);
