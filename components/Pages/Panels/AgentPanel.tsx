"use client";

import { X } from "lucide-react";
import pluralize from "pluralize";
import { memo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  PANEL_MODELS,
  type PanelModelId,
  type PanelTurn,
  type PanelVersionSummary,
} from "@/types/panels";
import { type BlockRef, resolveAnchor } from "./anchor";
import { anchorOf, type Comment } from "./types";

interface Props {
  blocks: BlockRef[];
  comments: Comment[];
  versions: PanelVersionSummary[];
  turns: PanelTurn[];
  currentVersionId: string | null;
  selectedCommentId: string | null;
  busy: boolean;
  model: PanelModelId;
  onModelChange: (model: PanelModelId) => void;
  hasPage: boolean;
  onSend: (prompt: string) => Promise<boolean>;
  onSelectComment: (commentId: string) => void;
  onDropComment: (commentId: string) => void;
  onRevert: (versionId: string) => void;
}

const shortModel = (id: string) => PANEL_MODELS.find((option) => option.id === id)?.label ?? id;

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
  onSend,
  onSelectComment,
  onDropComment,
  onRevert,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);
  const open = comments.filter((comment) => comment.status === "open");
  const versionLabelById = new Map(versions.map((version) => [version.id, version.versionNumber]));

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const submit = () => {
    const text = prompt.trim();
    if (busy) return;
    if (text.length === 0 && open.length === 0) return;
    void onSend(text).then((ok) => {
      if (ok) setPrompt("");
    });
  };

  const placeholder = (() => {
    if (!hasPage) return "A one-page funding summary for…";
    if (open.length > 0) return `Send to apply ${pluralize("pinned comment", open.length, true)}…`;
    return "What should change?";
  })();

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
          {PANEL_MODELS.map((option) => (
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
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {turns.map((turn) => (
              <TurnRow
                key={turn.id}
                turn={turn}
                versionNumber={turn.versionId ? versionLabelById.get(turn.versionId) : undefined}
              />
            ))}
          </div>
        )}
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
            {versions.map((version) => (
              <VersionChip
                key={version.id}
                version={version}
                current={version.id === currentVersionId}
                disabled={busy}
                onRevert={onRevert}
              />
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
            placeholder={placeholder}
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
              disabled={busy || (prompt.trim().length === 0 && open.length === 0)}
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

const VersionChip = memo(function VersionChip({
  version,
  current,
  disabled,
  onRevert,
}: {
  version: PanelVersionSummary;
  current: boolean;
  disabled: boolean;
  onRevert: (versionId: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={() => onRevert(version.id)}
      title={version.note}
      className="h-7 px-2 font-mono text-[11px]"
      style={
        current
          ? { background: "var(--kp-accent)", color: "var(--kp-accent-ink)" }
          : { background: "var(--kp-ground)", color: "var(--kp-ink-soft)" }
      }
    >
      v{version.versionNumber}
    </Button>
  );
});

const TurnRow = memo(function TurnRow({
  turn,
  versionNumber,
}: {
  turn: PanelTurn;
  versionNumber: number | undefined;
}) {
  const pinned = turn.pinnedCommentIds.length;
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="self-end rounded-xl rounded-br-sm px-3 py-2 text-sm leading-relaxed"
        style={{ background: "var(--kp-raised)", color: "var(--kp-ink)", maxWidth: "92%" }}
      >
        {turn.prompt.length > 0 ? turn.prompt : "Apply the pinned comments"}
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
            {versionNumber !== undefined ? (
              <>
                Wrote{" "}
                <span className="font-mono" style={{ color: "var(--kp-ink-soft)" }}>
                  v{versionNumber}
                </span>
              </>
            ) : (
              "No page change"
            )}
            <span className="font-mono"> · {shortModel(turn.modelId)}</span>
            {pinned > 0 ? ` · applied ${pluralize("comment", pinned, true)}` : null}
          </span>
        ) : null}

        {turn.status === "failed" ? (
          <span className="text-xs" style={{ color: "var(--kp-danger)" }}>
            {turn.error ?? "Failed"} — your text is still in the box.
          </span>
        ) : null}
      </div>

      {turn.status === "done" && turn.summary ? (
        <p
          className="whitespace-pre-wrap pl-0.5 text-xs leading-relaxed"
          style={{ color: "var(--kp-ink-soft)" }}
        >
          {turn.summary}
        </p>
      ) : null}
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
  const match = resolveAnchor(blocks, anchorOf(comment));

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
          {comment.blockLabel}
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
