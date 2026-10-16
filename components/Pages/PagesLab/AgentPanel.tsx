"use client";

import { X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type BlockRef, resolveAnchor } from "./anchor";
import type { Comment, Turn, Version } from "./types";

interface Props {
  blocks: BlockRef[];
  comments: Comment[];
  versions: Version[];
  turns: Turn[];
  currentVersionId: string | null;
  selectedCommentId: string | null;
  busy: boolean;
  model: string;
  onModelChange: (model: string) => void;
  hasPage: boolean;
  dryPrompt: string | null;
  onSend: (prompt: string) => Promise<boolean>;
  onSelectComment: (commentId: string) => void;
  onDropComment: (commentId: string) => void;
  onRevert: (versionId: string) => void;
  onDismissDry: () => void;
}

const MODELS = [
  { id: "claude-sonnet-5-5", label: "Sonnet" },
  { id: "claude-haiku-5-5", label: "Haiku" },
];

export function AgentPanel({
  blocks,
  comments,
  versions,
  turns,
  currentVersionId,
  selectedCommentId,
  busy,
  model,
  onModelChange,
  hasPage,
  dryPrompt,
  onSend,
  onSelectComment,
  onDropComment,
  onRevert,
  onDismissDry,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);
  const open = comments.filter((comment) => comment.status === "open");

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const submit = () => {
    const text = prompt.trim();
    if (busy) return;
    if (!hasPage && text.length === 0) return;
    void onSend(text).then((ok) => {
      if (ok) setPrompt("");
    });
  };

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col"
      style={{ background: "var(--kp-panel)", borderLeft: "1px solid var(--kp-line)" }}
    >
      <header
        className="flex shrink-0 items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--kp-line)" }}
      >
        <span
          className="size-1.5 rounded-full"
          style={{
            background: busy ? "var(--kp-accent)" : "var(--kp-line-strong)",
            boxShadow: busy
              ? "0 0 0 3px color-mix(in srgb, var(--kp-accent) 22%, transparent)"
              : "none",
          }}
        />
        <h2 className="font-medium text-sm tracking-tight" style={{ color: "var(--kp-ink)" }}>
          Karma AI
        </h2>
        <div
          className="ml-auto flex items-center gap-0.5 rounded-md p-0.5"
          style={{ background: "var(--kp-ground)" }}
        >
          {MODELS.map((option) => (
            <Button
              key={option.id}
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => onModelChange(option.id)}
              title={option.id}
              className="h-6 px-2 font-mono text-[10px]"
              style={
                model === option.id
                  ? { background: "var(--kp-accent-strong)", color: "var(--kp-sheet)" }
                  : { color: "var(--kp-ink-faint)" }
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      </header>

      <div ref={streamRef} className="kp-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {turns.length === 0 ? (
          <div className="pt-6">
            <p className="text-sm leading-relaxed" style={{ color: "var(--kp-ink-soft)" }}>
              Describe the panel you want. Karma AI writes it, reads the Karma API for real numbers,
              and rewrites any block you comment on.
            </p>
            <p className="mt-3 text-xs" style={{ color: "var(--kp-ink-faint)" }}>
              Nothing is saved — reloading starts over.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {turns.map((turn) => (
              <TurnRow key={turn.id} turn={turn} />
            ))}
          </div>
        )}

        {dryPrompt ? (
          <div
            className="mt-4 rounded-lg p-3"
            style={{ background: "var(--kp-ground)", border: "1px solid var(--kp-line)" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium text-xs" style={{ color: "var(--kp-ink)" }}>
                No credential — prompt only
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDismissDry}
                className="h-6 text-xs"
                style={{ color: "var(--kp-ink-faint)" }}
              >
                Dismiss
              </Button>
            </div>
            <pre
              className="kp-scroll max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed"
              style={{ color: "var(--kp-ink-soft)" }}
            >
              {dryPrompt}
            </pre>
          </div>
        ) : null}
      </div>

      {open.length > 0 ? (
        <div
          className="kp-scroll max-h-56 shrink-0 overflow-y-auto px-4 py-3"
          style={{ borderTop: "1px solid var(--kp-line)" }}
        >
          <p
            className="mb-2 font-mono text-[10px] uppercase tracking-widest"
            style={{ color: "var(--kp-ink-faint)" }}
          >
            {open.length} pinned
          </p>
          <div className="flex flex-col gap-1.5">
            {open.map((comment) => (
              <PinnedRow
                key={comment.id}
                comment={comment}
                blocks={blocks}
                selected={comment.id === selectedCommentId}
                onSelect={onSelectComment}
                onDrop={onDropComment}
              />
            ))}
          </div>
        </div>
      ) : null}

      {versions.length > 1 ? (
        <div className="shrink-0 px-4 py-3" style={{ borderTop: "1px solid var(--kp-line)" }}>
          <div className="flex flex-wrap gap-1.5">
            {versions.map((version, index) => (
              <Button
                key={version.id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRevert(version.id)}
                title={version.note}
                className="h-7 px-2 font-mono text-[11px]"
                style={
                  version.id === currentVersionId
                    ? { background: "var(--kp-accent)", color: "var(--kp-accent-ink)" }
                    : { background: "var(--kp-ground)", color: "var(--kp-ink-soft)" }
                }
              >
                v{index + 1}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="shrink-0 p-3" style={{ borderTop: "1px solid var(--kp-line)" }}>
        <div
          className="rounded-xl p-2 focus-within:ring-1"
          style={{ background: "var(--kp-ground)", border: "1px solid var(--kp-line)" }}
        >
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={3}
            disabled={busy}
            placeholder={
              hasPage
                ? open.length > 0
                  ? `Send to apply ${open.length} pinned ${open.length === 1 ? "comment" : "comments"}…`
                  : "What should change?"
                : "A one-page funding summary for…"
            }
            className="w-full resize-none bg-transparent px-1.5 py-1 text-sm outline-none disabled:opacity-60"
            style={{ color: "var(--kp-ink)" }}
          />
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="px-1.5 font-mono text-[10px]" style={{ color: "var(--kp-ink-faint)" }}>
              ⏎ send · ⇧⏎ new line
            </span>
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={busy || (!hasPage && prompt.trim().length === 0)}
              className="text-xs"
              style={{ background: "var(--kp-accent)", color: "var(--kp-accent-ink)" }}
            >
              {busy ? "Working…" : hasPage ? "Revise" : "Generate"}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

const TurnRow = memo(function TurnRow({ turn }: { turn: Turn }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="self-end rounded-xl rounded-br-sm px-3 py-2 text-sm leading-relaxed"
        style={{ background: "var(--kp-raised)", color: "var(--kp-ink)", maxWidth: "92%" }}
      >
        {turn.prompt}
      </div>

      <div className="flex items-center gap-1.5 pl-0.5">
        {turn.status === "working" ? (
          <>
            <span
              className="size-1.5 animate-pulse rounded-full"
              style={{ background: "var(--kp-accent)" }}
            />
            <span className="text-xs" style={{ color: "var(--kp-ink-soft)" }}>
              {turn.statusText ?? "Working…"}
            </span>
          </>
        ) : null}

        {turn.status === "done" ? (
          <span className="text-xs" style={{ color: "var(--kp-ink-faint)" }}>
            Wrote{" "}
            <span className="font-mono" style={{ color: "var(--kp-ink-soft)" }}>
              {turn.versionLabel}
            </span>
            {turn.modelLabel ? <span className="font-mono"> · {turn.modelLabel}</span> : null}
            {turn.pinnedCount > 0
              ? ` · applied ${turn.pinnedCount} ${turn.pinnedCount === 1 ? "comment" : "comments"}`
              : null}
          </span>
        ) : null}

        {turn.status === "failed" ? (
          <span className="text-xs" style={{ color: "var(--kp-danger)" }}>
            {turn.error ?? "Failed"} — your text is still in the box.
          </span>
        ) : null}
      </div>
    </div>
  );
});

interface PinnedRowProps {
  comment: Comment;
  blocks: BlockRef[];
  selected: boolean;
  onSelect: (commentId: string) => void;
  onDrop: (commentId: string) => void;
}

const PinnedRow = memo(function PinnedRow({
  comment,
  blocks,
  selected,
  onSelect,
  onDrop,
}: PinnedRowProps) {
  const match = resolveAnchor(blocks, comment.anchor);

  return (
    <div
      className="group flex items-start gap-2 rounded-lg px-2 py-1.5"
      style={{
        background: selected ? "var(--kp-raised)" : "transparent",
        border: `1px solid ${selected ? "var(--kp-line-strong)" : "transparent"}`,
      }}
    >
      <Button
        type="button"
        variant="ghost"
        onClick={() => onSelect(comment.id)}
        className="h-auto min-w-0 flex-1 flex-col items-start whitespace-normal p-0 text-left"
      >
        <span
          className="block truncate font-mono text-[10px]"
          style={{ color: match.kind === "orphan" ? "var(--kp-danger)" : "var(--kp-ink-faint)" }}
        >
          {match.kind === "orphan" ? "orphaned · " : ""}
          {comment.anchor.label}
        </span>
        <span className="mt-0.5 block text-xs leading-snug" style={{ color: "var(--kp-ink-soft)" }}>
          {comment.body}
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onDrop(comment.id)}
        aria-label="Remove comment"
        className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        style={{ color: "var(--kp-ink-faint)" }}
      >
        <X className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
});
