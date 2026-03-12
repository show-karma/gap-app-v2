"use client";

import { Send } from "lucide-react";
import { useCallback, useMemo, useRef } from "react";
import MentionAutocomplete from "@/components/FundingPlatform/ApplicationView/MentionAutocomplete";
import InviteReviewerModal from "@/components/FundingPlatform/ApplicationView/InviteReviewerModal";
import { Button } from "@/components/ui/button";
import { useMentionEditor } from "@/hooks/useMentionEditor";
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import type { CommentInputProps } from "../types";
import { CommentMarkdownInput } from "./CommentMarkdownInput";

const MENTION_KEYS = new Set(["ArrowDown", "ArrowUp", "Enter", "Escape"]);

export function CommentInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Add a comment... (Ctrl+Enter to send)",
  disabled = false,
  isLoading = false,
  programId,
  isAdmin = false,
}: CommentInputProps) {
  const enableMentions = !!programId;
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const mentionEditor = useMentionEditor({
    enabled: enableMentions,
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
    () => filteredReviewers.map((r) => ({ name: r.name, email: r.email })),
    [filteredReviewers]
  );

  const handleContentChange = useCallback(
    (newValue: string) => {
      if (enableMentions) {
        mentionEditor.handleContentChange(newValue, onChange);
      } else {
        onChange(newValue);
      }
    },
    [enableMentions, mentionEditor, onChange]
  );

  const handleMentionSelect = useCallback(
    (reviewer: { name: string; email: string }) => {
      mentionEditor.handleSelectReviewer(reviewer, value, onChange);
    },
    [mentionEditor, value, onChange]
  );

  const handleInvited = useCallback(
    (reviewer: { name: string; email: string }) => {
      mentionEditor.handleInvitedReviewer(reviewer, value, onChange);
    },
    [mentionEditor, value, onChange]
  );

  const handleKeyDownCapture = useCallback(
    (e: React.KeyboardEvent) => {
      if (!mentionEditor.isAutocompleteOpen || !MENTION_KEYS.has(e.key)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      mentionEditor.handleKeyDown(e.key, mentionItems, isAdmin, value, onChange);
    },
    [mentionEditor, mentionItems, isAdmin, value, onChange]
  );

  const handleSubmit = useCallback(async () => {
    if (!value.trim() || disabled || isLoading) return;
    await onSubmit();
  }, [value, disabled, isLoading, onSubmit]);

  const effectivePlaceholder = enableMentions
    ? `${placeholder} Use @ to mention reviewers.`
    : placeholder;

  return (
    <div className="flex gap-2">
      <div
        ref={editorContainerRef}
        className="relative flex-1"
        onKeyDownCapture={enableMentions ? handleKeyDownCapture : undefined}
      >
        <CommentMarkdownInput
          value={value}
          onChange={handleContentChange}
          onSubmit={handleSubmit}
          placeholder={effectivePlaceholder}
          disabled={disabled || isLoading}
          minHeight={100}
          maxHeight={200}
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
      <div className="flex flex-col gap-2">
        <Button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          isLoading={isLoading}
          aria-label="Send"
          className="h-full"
        >
          <Send className="w-4 h-4" />
          Send
        </Button>
      </div>
      {enableMentions && programId && (
        <InviteReviewerModal
          programId={programId}
          isOpen={mentionEditor.isInviteModalOpen}
          onClose={mentionEditor.handleCloseInviteModal}
          onInvited={handleInvited}
        />
      )}
    </div>
  );
}
