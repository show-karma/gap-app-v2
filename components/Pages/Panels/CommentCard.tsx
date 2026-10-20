"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { anchoredPosition } from "./anchored-position";
import type { Comment } from "./types";

const WIDTH = 288;
const HEIGHT = 180;

interface Props {
  rect: DOMRect;
  label: string;
  comments: Comment[];
  onEdit: (commentId: string, body: string) => void;
  onDrop: (commentId: string) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

export function CommentCard({
  rect,
  label,
  comments,
  onEdit,
  onDrop,
  onPointerEnter,
  onPointerLeave,
}: Props) {
  const { left, top } = anchoredPosition(rect, WIDTH, HEIGHT);
  const hostRef = useRef<HTMLElement>(null);

  // Pointer tracking keeps the card open while the cursor travels onto it. It
  // is not a user interaction, so it is bound imperatively rather than as JSX
  // handlers on a static element.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.addEventListener("mouseenter", onPointerEnter);
    host.addEventListener("mouseleave", onPointerLeave);
    return () => {
      host.removeEventListener("mouseenter", onPointerEnter);
      host.removeEventListener("mouseleave", onPointerLeave);
    };
  }, [onPointerEnter, onPointerLeave]);

  return (
    <aside
      ref={hostRef}
      aria-label={`Comments on ${label}`}
      className="kp-pop-in fixed z-50 rounded-xl p-2.5"
      style={{
        left,
        top,
        width: WIDTH,
        background: "var(--kp-raised)",
        border: "1px solid var(--kp-line-strong)",
        boxShadow: "var(--kp-sheet-shadow)",
      }}
    >
      <p
        className="mb-2 truncate px-1 font-mono text-[10px]"
        style={{ color: "var(--kp-ink-faint)" }}
        title={label}
      >
        {label}
      </p>

      <div className="flex flex-col gap-1">
        {comments.map((comment) => (
          <Row key={comment.id} comment={comment} onEdit={onEdit} onDrop={onDrop} />
        ))}
      </div>
    </aside>
  );
}

function Row({
  comment,
  onEdit,
  onDrop,
}: {
  comment: Comment;
  onEdit: (commentId: string, body: string) => void;
  onDrop: (commentId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) fieldRef.current?.focus();
  }, [editing]);

  const save = () => {
    const text = draft.trim();
    if (text.length > 0 && text !== comment.body) onEdit(comment.id, text);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-lg p-1.5" style={{ background: "var(--kp-ground)" }}>
        <Textarea
          ref={fieldRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              save();
            }
            if (event.key === "Escape") {
              setDraft(comment.body);
              setEditing(false);
            }
          }}
          rows={3}
          className="w-full resize-none bg-transparent px-1 text-sm outline-none"
          style={{ color: "var(--kp-ink)" }}
        />
        <div className="flex justify-end gap-1 pt-1">
          <IconButton label="Cancel edit" onClick={() => setEditing(false)}>
            <X className="size-3.5" aria-hidden />
          </IconButton>
          <IconButton label="Save comment" onClick={save} accent>
            <Check className="size-3.5" aria-hidden />
          </IconButton>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-1.5 rounded-lg px-1.5 py-1.5">
      <p
        className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-snug"
        style={{ color: "var(--kp-ink)" }}
      >
        {comment.body}
      </p>
      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <IconButton label="Edit comment" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" aria-hidden />
        </IconButton>
        <IconButton label="Remove comment" onClick={() => onDrop(comment.id)}>
          <Trash2 className="size-3.5" aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  accent,
  children,
}: {
  label: string;
  onClick: () => void;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="size-7"
      style={
        accent
          ? { background: "var(--kp-accent-strong)", color: "var(--kp-sheet)" }
          : { color: "var(--kp-ink-faint)" }
      }
    >
      {children}
    </Button>
  );
}
