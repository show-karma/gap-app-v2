"use client";

import type { FC } from "react";
import CommentInput from "../CommentInput";

export interface StickyCommentInputProps {
  /** Callback when comment is submitted */
  onSubmit: (content: string) => Promise<void>;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the user is an admin */
  isAdmin?: boolean;
}

/**
 * Sticky comment input that stays at the bottom of the Discussion tab.
 * Has visual separation from the timeline with shadow and border.
 */
export const StickyCommentInput: FC<StickyCommentInputProps> = ({
  onSubmit,
  disabled = false,
  placeholder,
  isAdmin = false,
}) => {
  const defaultPlaceholder = isAdmin
    ? "Add an admin comment..."
    : "Add a comment for this application...";

  return (
    <div className="sticky bottom-0 bg-white dark:bg-zinc-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] p-4">
      <CommentInput
        onSubmit={onSubmit}
        disabled={disabled}
        placeholder={placeholder || defaultPlaceholder}
      />
    </div>
  );
};

export default StickyCommentInput;
