"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/utilities/tailwind";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
});

// Hoisted to avoid recreating on every render
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PREVIEW_OPTIONS = { rehypePlugins: [[rehypeSanitize]] as any };

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

  useEffect(() => {
    setMounted(true);
  }, []);

  const colorMode = currentTheme === "dark" ? "dark" : "light";

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && onSubmit) {
        e.preventDefault();
        await onSubmit();
      }
    },
    [onSubmit]
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: wrapper div for MDEditor with Ctrl+Enter handler
    <div
      data-color-mode={mounted ? colorMode : "light"}
      className={cn(
        "rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onKeyDown={handleKeyDown}
    >
      {mounted ? (
        <MDEditor
          value={value}
          onChange={(val) => onChange(val ?? "")}
          preview="edit"
          height={minHeight}
          minHeight={minHeight}
          maxHeight={maxHeight}
          data-color-mode={colorMode}
          visibleDragbar={false}
          hideToolbar={false}
          textareaProps={{
            placeholder,
            disabled,
            spellCheck: true,
          }}
          highlightEnable={false}
          previewOptions={PREVIEW_OPTIONS}
        />
      ) : (
        <div
          className="flex items-center justify-center bg-gray-50 dark:bg-zinc-800"
          style={{ height: minHeight }}
        >
          <div className="text-gray-400 dark:text-gray-500 text-sm">Loading editor...</div>
        </div>
      )}
    </div>
  );
}
