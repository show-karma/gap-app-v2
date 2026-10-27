"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { SafeMdEditor } from "@/components/Utilities/SafeMdEditor";
import { cn } from "@/utilities/tailwind";
import { useAutoGrowEditor } from "../hooks/use-auto-grow-editor";

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
  maxHeight,
}: CommentMarkdownInputProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const height = useAutoGrowEditor(containerRef, { minHeight, maxHeight, enabled: mounted });

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
      ref={containerRef}
      className={cn(
        "rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onKeyDown={handleKeyDown}
    >
      {mounted ? (
        <SafeMdEditor
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
          style={{ height, minHeight }}
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
