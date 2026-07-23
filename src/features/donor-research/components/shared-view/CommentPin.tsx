"use client";

import pluralize from "pluralize";
import { type KeyboardEvent, memo } from "react";

interface CommentPinProps {
  /** Number of comments (root + all descendants) anchored to this target. */
  count: number;
  /** Stable key used by parents to identify which pin was clicked. */
  targetKey: string;
  /** Click handler. Opens the sidebar with the matching root scrolled into view. */
  onActivate: (targetKey: string) => void;
  /** Optional label for screen readers, e.g. "lead candidate". */
  ariaLabel?: string;
}

/**
 * Pin badge rendered absolutely-positioned at the top-right of an
 * anchored target (section root or candidate card root). Click /
 * Enter / Space opens the comment sidebar with the root row for this
 * target scrolled into view.
 */
const CommentPinComponent = ({ count, targetKey, onActivate, ariaLabel }: CommentPinProps) => {
  if (count <= 0) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate(targetKey);
    }
  };

  const label = pluralize("comment", count, true);

  return (
    <button
      type="button"
      onClick={() => onActivate(targetKey)}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel ? `${label} on ${ariaLabel}` : label}
      data-comment-pin
      data-target-key={targetKey}
      className="inline-flex items-center gap-1.5 rounded-full border border-sf-line-strong bg-sf-card/95 px-2.5 py-1 text-[11.5px] font-[650] text-sf-heading shadow-sm backdrop-blur transition-colors hover:bg-sf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
      {label}
    </button>
  );
};

export const CommentPin = memo(CommentPinComponent);
