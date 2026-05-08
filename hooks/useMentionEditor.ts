"use client";

import { type RefObject, useCallback, useRef, useState } from "react";
import { getCaretCoordinates } from "@/utilities/getCaretCoordinates";
import { insertMention } from "@/utilities/mentions";

interface MentionReviewer {
  name: string;
  email: string;
}

interface UseMentionEditorOptions {
  enabled?: boolean;
  editorRef?: RefObject<HTMLDivElement | null>;
}

export interface CaretPosition {
  top: number;
  left: number;
}

export function useMentionEditor(options: UseMentionEditorOptions = {}) {
  const { enabled = true, editorRef } = options;

  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviteGranteeModalOpen, setIsInviteGranteeModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [caretPosition, setCaretPosition] = useState<CaretPosition | null>(null);
  const cursorPositionRef = useRef(0);
  const savedFilterTextRef = useRef("");

  const computeCaretPosition = useCallback(
    (atIndex: number) => {
      if (!editorRef?.current) return;
      const textarea = editorRef.current.querySelector("textarea");
      if (!textarea) return;

      const coords = getCaretCoordinates(textarea, atIndex);
      const textareaRect = textarea.getBoundingClientRect();
      const containerRect = editorRef.current.getBoundingClientRect();
      const computed = window.getComputedStyle(textarea);
      const lineHeight = Number.parseInt(computed.lineHeight, 10) || 20;
      const dropdownWidth = 288; // w-72 = 18rem = 288px

      const rawTop = coords.top + (textareaRect.top - containerRect.top) + lineHeight;
      const rawLeft = coords.left + (textareaRect.left - containerRect.left);
      const maxLeft = containerRect.width - dropdownWidth;
      const finalLeft = Math.max(0, Math.min(rawLeft, maxLeft));

      setCaretPosition({ top: rawTop, left: finalLeft });
    },
    [editorRef]
  );

  const handleContentChange = useCallback(
    (newContent: string, onChange: (value: string) => void) => {
      onChange(newContent);

      if (!enabled) return;

      const textarea = editorRef?.current?.querySelector("textarea");
      const cursorPos = textarea?.selectionStart ?? newContent.length;
      cursorPositionRef.current = cursorPos;

      const textBeforeCursor = newContent.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");
      if (lastAtIndex === -1) {
        setIsAutocompleteOpen(false);
        setFilterText("");
        return;
      }

      const textAfterAt = newContent.slice(lastAtIndex + 1, cursorPos);

      if (textAfterAt.includes("\n") || textAfterAt.startsWith("[")) {
        setIsAutocompleteOpen(false);
        setFilterText("");
        return;
      }

      const charBeforeAt = lastAtIndex > 0 ? newContent[lastAtIndex - 1] : " ";
      if (charBeforeAt !== " " && charBeforeAt !== "\n" && lastAtIndex !== 0) {
        setIsAutocompleteOpen(false);
        setFilterText("");
        return;
      }

      computeCaretPosition(lastAtIndex);
      setFilterText(textAfterAt);
      setSelectedIndex(0);
      setIsAutocompleteOpen(true);
    },
    [enabled, editorRef, computeCaretPosition]
  );

  const getCurrentCursorPosition = useCallback(() => {
    const textarea = editorRef?.current?.querySelector("textarea");
    return textarea?.selectionStart ?? cursorPositionRef.current;
  }, [editorRef]);

  const handleSelectReviewer = useCallback(
    (reviewer: MentionReviewer, currentContent: string, onChange: (value: string) => void) => {
      const newContent = insertMention(
        currentContent,
        getCurrentCursorPosition(),
        reviewer,
        filterText
      );
      onChange(newContent);
      setIsAutocompleteOpen(false);
      setFilterText("");
    },
    [filterText, getCurrentCursorPosition]
  );

  const handleCloseAutocomplete = useCallback(() => {
    setIsAutocompleteOpen(false);
    setFilterText("");
    setSelectedIndex(0);
  }, []);

  const handleOpenInviteModal = useCallback(() => {
    savedFilterTextRef.current = filterText;
    setIsAutocompleteOpen(false);
    setIsInviteModalOpen(true);
  }, [filterText]);

  const handleCloseInviteModal = useCallback(() => {
    setIsInviteModalOpen(false);
  }, []);

  const handleOpenInviteGranteeModal = useCallback(() => {
    savedFilterTextRef.current = filterText;
    setIsAutocompleteOpen(false);
    setIsInviteGranteeModalOpen(true);
  }, [filterText]);

  const handleCloseInviteGranteeModal = useCallback(() => {
    setIsInviteGranteeModalOpen(false);
  }, []);

  const handleInvitedReviewer = useCallback(
    (reviewer: MentionReviewer, currentContent: string, onChange: (value: string) => void) => {
      const savedFilter = savedFilterTextRef.current;
      const newContent = insertMention(
        currentContent,
        getCurrentCursorPosition(),
        reviewer,
        savedFilter
      );
      onChange(newContent);
      savedFilterTextRef.current = "";
      setIsAutocompleteOpen(false);
      setFilterText("");
    },
    [getCurrentCursorPosition]
  );

  const handleKeyDown = useCallback(
    (
      key: string,
      items: MentionReviewer[],
      reviewerCount: number,
      hasGranteeSection: boolean,
      content: string,
      onChange: (value: string) => void,
      canInviteGrantee = true
    ) => {
      // Layout:
      //   0..reviewerCount-1                          → reviewer items
      //   reviewerCount                               → "Invite reviewer" button
      //   reviewerCount+1..reviewerCount+granteeCount → grantee items
      //   reviewerCount+granteeCount+1                → "Invite grantee" button (if canInviteGrantee)
      const inviteReviewerIndex = reviewerCount;
      const granteeStartIndex = reviewerCount + 1;
      const inviteGranteeIndex = items.length + 1;
      const showInviteGrantee = hasGranteeSection && canInviteGrantee;
      const totalItems = items.length + 1 + (showInviteGrantee ? 1 : 0);

      switch (key) {
        case "ArrowDown":
          setSelectedIndex((prev) => (prev + 1) % totalItems);
          break;
        case "ArrowUp":
          setSelectedIndex((prev) => (prev <= 0 ? totalItems - 1 : prev - 1));
          break;
        case "Enter": {
          if (selectedIndex < reviewerCount) {
            handleSelectReviewer(items[selectedIndex], content, onChange);
          } else if (selectedIndex === inviteReviewerIndex) {
            handleOpenInviteModal();
          } else if (
            hasGranteeSection &&
            selectedIndex >= granteeStartIndex &&
            selectedIndex < inviteGranteeIndex
          ) {
            handleSelectReviewer(items[selectedIndex - 1], content, onChange);
          } else if (showInviteGrantee && selectedIndex === inviteGranteeIndex) {
            handleOpenInviteGranteeModal();
          }
          break;
        }
        case "Escape":
          handleCloseAutocomplete();
          break;
      }
    },
    [
      selectedIndex,
      handleSelectReviewer,
      handleOpenInviteModal,
      handleOpenInviteGranteeModal,
      handleCloseAutocomplete,
    ]
  );

  return {
    isAutocompleteOpen,
    filterText,
    isInviteModalOpen,
    isInviteGranteeModalOpen,
    selectedIndex,
    caretPosition,
    handleContentChange,
    handleSelectReviewer,
    handleCloseAutocomplete,
    handleOpenInviteModal,
    handleCloseInviteModal,
    handleOpenInviteGranteeModal,
    handleCloseInviteGranteeModal,
    handleInvitedReviewer,
    handleKeyDown,
  };
}
