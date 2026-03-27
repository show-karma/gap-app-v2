"use client";

import Placeholder from "@tiptap/extension-placeholder";
// Tiptap is the editor engine that Vrite (https://github.com/vriteio/vrite) uses under the hood.
// Vrite ships as a headless CMS platform rather than a standalone npm editor component,
// so we use Tiptap directly with the tiptap-markdown extension to keep the same
// markdown-in / markdown-out contract as the previous @uiw/react-md-editor implementation.
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { Markdown } from "tiptap-markdown";
import { cn } from "@/utilities/tailwind";

interface CommentMarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
  maxHeight?: number;
}

export function CommentMarkdownInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Add a comment... (Markdown supported)",
  disabled = false,
  minHeight = 80,
  maxHeight = 200,
}: CommentMarkdownInputProps) {
  const { theme: currentTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const externalUpdateRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const colorMode = currentTheme === "dark" ? "dark" : "light";

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: false, tightLists: true, breaks: true }),
    ],
    content: value,
    editable: !disabled,
    onUpdate({ editor: ed }) {
      if (externalUpdateRef.current) return;
      onChange(ed.storage.markdown.getMarkdown() as string);
    },
    immediatelyRender: false,
  });

  // Sync external value into editor
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.storage.markdown.getMarkdown() as string;
    if (current !== value) {
      externalUpdateRef.current = true;
      editor.commands.setContent(value);
      externalUpdateRef.current = false;
    }
  }, [editor, value]);

  // Update editable state
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && onSubmit) {
        e.preventDefault();
        await onSubmit();
      }
    },
    [onSubmit]
  );

  if (!mounted) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ height: minHeight }}
      >
        <div className="text-gray-400 dark:text-gray-500 text-sm">Loading editor...</div>
      </div>
    );
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Tiptap wrapper needs keyDown for Cmd+Enter submit
    <div
      data-color-mode={colorMode}
      className={cn(
        "rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onKeyDown={handleKeyDown}
    >
      <EditorContent
        editor={editor}
        className={cn(
          "p-2 text-black dark:text-white bg-white dark:bg-zinc-900",
          "prose prose-sm max-w-none",
          "[&_.ProseMirror]:outline-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
        )}
        style={{ minHeight, maxHeight, overflowY: "auto" }}
      />
    </div>
  );
}
