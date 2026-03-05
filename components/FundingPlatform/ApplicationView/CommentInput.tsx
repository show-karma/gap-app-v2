"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { type FC, useCallback, useMemo, useRef, useState } from "react";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Spinner } from "@/components/Utilities/Spinner";
import { useMentionEditor } from "@/hooks/useMentionEditor";
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { cn } from "@/utilities/tailwind";
import InviteReviewerModal from "./InviteReviewerModal";
import MentionAutocomplete from "./MentionAutocomplete";

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  programId?: string;
  enableMentions?: boolean;
  isAdmin?: boolean;
}

const MENTION_KEYS = new Set(["ArrowDown", "ArrowUp", "Enter", "Escape"]);

const CommentInput: FC<CommentInputProps> = ({
  onSubmit,
  placeholder = "Add a comment...",
  disabled = false,
  className = "",
  programId,
  enableMentions = false,
  isAdmin = false,
}) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const mentionEditor = useMentionEditor({
    enabled: enableMentions && !!programId,
    editorRef: editorContainerRef,
  });

  const { data: reviewers } = useMilestoneReviewers(programId ?? "");

  const filteredReviewers = useMemo(() => {
    if (!reviewers) return [];
    if (!mentionEditor.filterText) return reviewers;
    const lower = mentionEditor.filterText.toLowerCase();
    return reviewers.filter(
      (r) => r.name.toLowerCase().includes(lower) || r.email.toLowerCase().includes(lower)
    );
  }, [reviewers, mentionEditor.filterText]);

  const mentionItems = useMemo(
    () =>
      filteredReviewers.map((r) => ({
        name: r.name,
        email: r.email,
      })),
    [filteredReviewers]
  );

  const handleContentChange = useCallback(
    (value: string) => {
      if (enableMentions && programId) {
        mentionEditor.handleContentChange(value, setContent);
      } else {
        setContent(value);
      }
    },
    [enableMentions, programId, mentionEditor]
  );

  const handleMentionSelect = useCallback(
    (reviewer: { name: string; email: string }) => {
      mentionEditor.handleSelectReviewer(reviewer, content, setContent);
    },
    [mentionEditor, content]
  );

  const handleInvited = useCallback(
    (reviewer: { name: string; email: string }) => {
      mentionEditor.handleInvitedReviewer(reviewer, content, setContent);
    },
    [mentionEditor, content]
  );

  const handleKeyDownCapture = useCallback(
    (e: React.KeyboardEvent) => {
      if (!mentionEditor.isAutocompleteOpen || !MENTION_KEYS.has(e.key)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      mentionEditor.handleKeyDown(e.key, mentionItems, isAdmin, content, setContent);
    },
    [mentionEditor, mentionItems, isAdmin, content]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const resolved = enableMentions
        ? mentionEditor.resolveContent(content.trim())
        : content.trim();
      await onSubmit(resolved);
      setContent("");
    } catch {
      // Error handling delegated to parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="flex flex-col space-y-3">
        <div
          ref={editorContainerRef}
          className="relative w-full"
          style={{ minHeight: "200px" }}
          onKeyDownCapture={enableMentions ? handleKeyDownCapture : undefined}
        >
          <MarkdownEditor
            value={content}
            onChange={handleContentChange}
            height={200}
            minHeight={undefined}
            disabled={disabled || isSubmitting}
            placeholderText={
              enableMentions ? `${placeholder} Use @ to mention reviewers.` : placeholder
            }
            className="text-sm"
            overflow={true}
          />
          {enableMentions && programId && (
            <MentionAutocomplete
              programId={programId}
              isOpen={mentionEditor.isAutocompleteOpen}
              filterText={mentionEditor.filterText}
              isAdmin={isAdmin}
              selectedIndex={mentionEditor.selectedIndex}
              caretPosition={mentionEditor.caretPosition}
              onSelect={handleMentionSelect}
              onInviteNew={mentionEditor.handleOpenInviteModal}
              onClose={mentionEditor.handleCloseAutocomplete}
            />
          )}
        </div>
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!content.trim() || disabled || isSubmitting}
            className={cn(
              "inline-flex items-center px-4 py-2 border border-transparent",
              "text-sm font-medium rounded-lg shadow-sm",
              "text-white bg-blue-600 hover:bg-blue-700",
              "dark:bg-blue-500 dark:hover:bg-blue-600",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors duration-200"
            )}
          >
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4 mr-2 border-2" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </div>

      {enableMentions && programId && (
        <InviteReviewerModal
          programId={programId}
          isOpen={mentionEditor.isInviteModalOpen}
          onClose={mentionEditor.handleCloseInviteModal}
          onInvited={handleInvited}
        />
      )}
    </form>
  );
};

export default CommentInput;
