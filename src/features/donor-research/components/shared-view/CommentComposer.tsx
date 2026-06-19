"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CommentAnchor } from "@/src/features/donor-research/components/anchor/types";

interface CommentComposerProps {
  /** When set, the composer is in reply mode. Visible parent context. */
  parentDisplayName?: string;
  /** Pre-captured anchor for root composers; null for replies. */
  anchor?: CommentAnchor | null;
  /** When the parent surfaces a rate-limit / collision error from the mutation. */
  externalError?: string | null;
  /** True while the mutation is in flight — disables submit. */
  isSubmitting?: boolean;
  /** Cancel handler — closes the composer. */
  onCancel: () => void;
  /** Submit handler — body string. */
  onSubmit: (body: string) => Promise<void> | void;
}

export function CommentComposer({
  parentDisplayName,
  anchor,
  externalError,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: CommentComposerProps) {
  const [body, setBody] = useState("");
  const trimmed = body.trim();
  const isReply = Boolean(parentDisplayName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    await onSubmit(trimmed);
    setBody("");
  };

  return (
    <form className="space-y-2 rounded-md border border-border bg-background p-3" onSubmit={handleSubmit}>
      {isReply ? (
        <div className="text-xs text-muted-foreground">Replying to {parentDisplayName}</div>
      ) : anchor ? (
        <div className="text-xs text-muted-foreground">
          {anchor.kind === "section"
            ? `On ${anchor.sectionKey}`
            : anchor.kind === "candidate"
              ? "On this candidate"
              : `On "${anchor.quote.slice(0, 80)}${anchor.quote.length > 80 ? "…" : ""}"`}
        </div>
      ) : null}

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={isReply ? "Write a reply…" : "Add a comment…"}
        maxLength={5000}
        rows={3}
        className="text-sm"
        autoFocus
      />

      {externalError && (
        <p className="text-sm text-destructive" role="alert">
          {externalError}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!trimmed || isSubmitting}>
          {isSubmitting ? "Posting…" : isReply ? "Reply" : "Comment"}
        </Button>
      </div>
    </form>
  );
}
