"use client";

import { PlusIcon } from "lucide-react";
import { memo } from "react";

interface AddCommentAffordanceProps {
  /** Click handler — opens the root composer with this target's anchor. */
  onClick: () => void;
  /** Label for assistive tech, e.g. "Add comment on lead candidate". */
  ariaLabel: string;
}

/**
 * Tiny "+" button rendered alongside the CommentPin on each anchored
 * target. Triggers the root composer with a section/candidate anchor
 * when no text is selected.
 */
const AddCommentAffordanceComponent = ({ onClick, ariaLabel }: AddCommentAffordanceProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    data-add-comment
    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <PlusIcon className="h-3.5 w-3.5" aria-hidden />
  </button>
);

export const AddCommentAffordance = memo(AddCommentAffordanceComponent);
