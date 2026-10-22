"use client";

import { type RefObject, useCallback, useState } from "react";
import { getCaretCoordinates } from "@/utilities/getCaretCoordinates";
import { insertNoteMention } from "@/utilities/noteMentions";

export interface NoteMentionCaret {
  top: number;
  left: number;
}

const DROPDOWN_WIDTH = 640;

/**
 * "@" typeahead for a plain textarea. Tracks whether a mention is being typed,
 * the text after the "@", where to put the dropdown, and which suggestion the
 * arrow keys have reached. Picking a suggestion swaps the "@filter" for a token.
 */
export function useNoteMentionEditor(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  containerRef: RefObject<HTMLDivElement | null>
) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [caret, setCaret] = useState<NoteMentionCaret | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setFilterText("");
    setSelectedIndex(0);
  }, []);

  const placeDropdown = useCallback(
    (atIndex: number) => {
      const textarea = textareaRef.current;
      const container = containerRef.current;
      if (!textarea || !container) return;
      const coords = getCaretCoordinates(textarea, atIndex);
      const textareaRect = textarea.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const lineHeight = Number.parseInt(window.getComputedStyle(textarea).lineHeight, 10) || 20;
      const top = coords.top + (textareaRect.top - containerRect.top) + lineHeight;
      const left = coords.left + (textareaRect.left - containerRect.left);
      setCaret({ top, left: Math.max(0, Math.min(left, containerRect.width - DROPDOWN_WIDTH)) });
    },
    [textareaRef, containerRef]
  );

  const handleContentChange = useCallback(
    (content: string) => {
      const cursor = textareaRef.current?.selectionStart ?? content.length;
      const before = content.slice(0, cursor);
      const atIndex = before.lastIndexOf("@");
      if (atIndex === -1) return close();
      const typed = before.slice(atIndex + 1);
      const charBefore = atIndex > 0 ? content[atIndex - 1] : " ";
      const boundary = charBefore === " " || charBefore === "\n";
      if (typed.includes("\n") || typed.startsWith("[") || !boundary) return close();
      placeDropdown(atIndex);
      setFilterText(typed);
      setSelectedIndex(0);
      setIsOpen(true);
    },
    [textareaRef, close, placeDropdown]
  );

  const pick = useCallback(
    (label: string, content: string): string => {
      const cursor = textareaRef.current?.selectionStart ?? content.length;
      close();
      return insertNoteMention(content, cursor, label);
    },
    [textareaRef, close]
  );

  /** Returns true when the key was consumed by the dropdown. */
  const handleKeyDown = useCallback(
    (key: string, optionCount: number, onPick: (index: number) => void): boolean => {
      if (!isOpen) return false;
      if (key === "Escape") {
        close();
        return true;
      }
      if (optionCount === 0) return false;
      if (key === "ArrowDown") {
        setSelectedIndex((index) => (index + 1) % optionCount);
        return true;
      }
      if (key === "ArrowUp") {
        setSelectedIndex((index) => (index <= 0 ? optionCount - 1 : index - 1));
        return true;
      }
      if (key === "Enter" || key === "Tab") {
        onPick(selectedIndex);
        return true;
      }
      return false;
    },
    [isOpen, close, selectedIndex]
  );

  return {
    isOpen,
    filterText,
    selectedIndex,
    setSelectedIndex,
    caret,
    handleContentChange,
    handleKeyDown,
    pick,
    close,
  };
}
