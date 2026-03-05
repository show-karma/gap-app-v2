"use client";

import { type RefObject, useCallback, useRef, useState } from "react";
import { getCaretCoordinates } from "@/utilities/getCaretCoordinates";
import { insertMention, resolveMentionsForSubmit } from "@/utilities/mentions";

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [caretPosition, setCaretPosition] = useState<CaretPosition | null>(null);
  const cursorPositionRef = useRef(0);
  const savedFilterTextRef = useRef("");
  const mentionsMapRef = useRef(new Map<string, string>());

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

      console.debug("[mention-caret] final position:", {
        top: rawTop,
        left: finalLeft,
        rawLeft,
        maxLeft,
      });

      setCaretPosition({ top: rawTop, left: finalLeft });
    },
    [editorRef]
  );

  const handleContentChange = useCallback(
    (newContent: string, onChange: (value: string) => void) => {
      onChange(newContent);

      if (!enabled) return;

      cursorPositionRef.current = newContent.length;

      const lastAtIndex = newContent.lastIndexOf("@");
      if (lastAtIndex === -1) {
        setIsAutocompleteOpen(false);
        setFilterText("");
        return;
      }

      const textAfterAt = newContent.slice(lastAtIndex + 1);

      if (textAfterAt.includes("\n") || textAfterAt.includes(" ")) {
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
      cursorPositionRef.current = newContent.length;
    },
    [enabled, computeCaretPosition]
  );

  const handleSelectReviewer = useCallback(
    (reviewer: MentionReviewer, currentContent: string, onChange: (value: string) => void) => {
      mentionsMapRef.current.set(reviewer.name, reviewer.email);
      const newContent = insertMention(
        currentContent,
        cursorPositionRef.current,
        reviewer,
        filterText
      );
      onChange(newContent);
      setIsAutocompleteOpen(false);
      setFilterText("");
    },
    [filterText]
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

  const handleInvitedReviewer = useCallback(
    (reviewer: MentionReviewer, currentContent: string, onChange: (value: string) => void) => {
      mentionsMapRef.current.set(reviewer.name, reviewer.email);
      const savedFilter = savedFilterTextRef.current;
      const newContent = insertMention(
        currentContent,
        cursorPositionRef.current,
        reviewer,
        savedFilter
      );
      onChange(newContent);
      savedFilterTextRef.current = "";
      setIsAutocompleteOpen(false);
      setFilterText("");
    },
    []
  );

  const handleKeyDown = useCallback(
    (
      key: string,
      items: MentionReviewer[],
      isAdmin: boolean,
      content: string,
      onChange: (value: string) => void
    ) => {
      const totalItems = items.length + (isAdmin ? 1 : 0);
      if (totalItems === 0) return;

      switch (key) {
        case "ArrowDown":
          setSelectedIndex((prev) => (prev + 1) % totalItems);
          break;
        case "ArrowUp":
          setSelectedIndex((prev) => (prev <= 0 ? totalItems - 1 : prev - 1));
          break;
        case "Enter": {
          if (selectedIndex < items.length) {
            handleSelectReviewer(items[selectedIndex], content, onChange);
          } else if (isAdmin && selectedIndex === items.length) {
            handleOpenInviteModal();
          }
          break;
        }
        case "Escape":
          handleCloseAutocomplete();
          break;
      }
    },
    [selectedIndex, handleSelectReviewer, handleOpenInviteModal, handleCloseAutocomplete]
  );

  const resolveContent = useCallback((content: string) => {
    return resolveMentionsForSubmit(content, mentionsMapRef.current);
  }, []);

  return {
    isAutocompleteOpen,
    filterText,
    isInviteModalOpen,
    selectedIndex,
    caretPosition,
    handleContentChange,
    handleSelectReviewer,
    handleCloseAutocomplete,
    handleOpenInviteModal,
    handleCloseInviteModal,
    handleInvitedReviewer,
    handleKeyDown,
    resolveContent,
  };
}
