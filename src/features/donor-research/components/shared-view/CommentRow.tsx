"use client";

import pluralize from "pluralize";
import { memo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { SharedReportCommentNode } from "@/types/donor-research-comments";

const MAX_VISUAL_DEPTH = 4;

interface CommentRowProps {
  node: SharedReportCommentNode;
  depth?: number;
  onReply: (parentId: string) => void;
}

function formatRelative(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const deltaSeconds = (Date.now() - ts) / 1000;
  if (deltaSeconds < 60) return "just now";
  if (deltaSeconds < 3600) return `${Math.floor(deltaSeconds / 60)}m ago`;
  if (deltaSeconds < 86400) return `${Math.floor(deltaSeconds / 3600)}h ago`;
  return `${Math.floor(deltaSeconds / 86400)}d ago`;
}

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

const CommentRowComponent = ({ node, depth = 0, onReply }: CommentRowProps) => {
  const [expanded, setExpanded] = useState(depth < MAX_VISUAL_DEPTH);
  const indentLevel = Math.min(depth, MAX_VISUAL_DEPTH);
  const indentClasses =
    indentLevel === 0
      ? ""
      : indentLevel === 1
        ? "pl-4"
        : indentLevel === 2
          ? "pl-8"
          : indentLevel === 3
            ? "pl-12"
            : "pl-16";

  const showCollapsed = !expanded && node.children.length > 0;
  const visibleChildren = expanded ? node.children : [];
  const decodedBody = decodeEntities(node.body);
  const lines = decodedBody.split(/\n/);

  return (
    <div className={`border-l border-border/50 ${indentClasses}`}>
      <article className="rounded-md bg-background p-3">
        <header className="mb-1 flex items-center gap-2 text-xs">
          <span className="font-medium">{node.displayName}</span>
          {node.isAdvisor && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] uppercase">
              Advisor
            </Badge>
          )}
          <span className="text-muted-foreground">{formatRelative(node.createdAt)}</span>
          {node._optimistic && <span className="text-muted-foreground">Sending…</span>}
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
            onClick={() => onReply(node.id)}
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
        <CommentRow key={child.id} node={child} depth={depth + 1} onReply={onReply} />
      ))}
    </div>
  );
};

export const CommentRow = memo(CommentRowComponent);
