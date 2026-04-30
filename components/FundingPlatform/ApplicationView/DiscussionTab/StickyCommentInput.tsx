"use client";

import { type FC, useRef, useState } from "react";
import { CommentInput } from "@/src/features/application-comments/components/CommentInput";

export interface StickyCommentInputProps {
  /** Callback when comment is submitted */
  onSubmit: (content: string) => Promise<void>;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the user is an admin */
  isAdmin?: boolean;
  /** Program ID for mention autocomplete */
  programId?: string;
}

/**
 * Sticky comment input that stays at the bottom of the Comments tab.
 * Has visual separation from the timeline with shadow and border.
 */
export const StickyCommentInput: FC<StickyCommentInputProps> = ({
  onSubmit,
  disabled = false,
  placeholder,
  isAdmin = false,
  programId,
}) => {
  const defaultPlaceholder = isAdmin
    ? "Add an admin comment..."
    : "Add a comment for this application...";

  const [content, setContent] = useState("");
  const contentRef = useRef(content);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (value: string) => {
    contentRef.current = value;
    setContent(value);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(contentRef.current.trim());
      contentRef.current = "";
      setContent("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sticky bottom-0 bg-white dark:bg-zinc-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] p-4">
      <CommentInput
        value={content}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        disabled={disabled}
        placeholder={placeholder || defaultPlaceholder}
        programId={programId}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default StickyCommentInput;
