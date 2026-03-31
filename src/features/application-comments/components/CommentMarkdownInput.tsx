"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/utilities/tailwind";

const MdEditor = dynamic(
  () =>
    import("md-editor-rt/lib/style.css" as string).then(() =>
      import("md-editor-rt").then((mod) => mod.MdEditor)
    ),
  { ssr: false }
);

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
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    // biome-ignore lint/a11y/noStaticElementInteractions: MdEditor wrapper needs keyDown for Cmd+Enter submit
    <div
      className={cn(
        "rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onKeyDown={handleKeyDown}
    >
      {mounted ? (
        <MdEditor
          value={value}
          onChange={(val) => onChange(val ?? "")}
          preview={false}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          disabled={disabled}
          placeholder={placeholder}
          noUploadImg
          footers={[]}
          toolbars={[]}
          language="en-US"
          style={{ height: minHeight, minHeight, maxHeight }}
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
