"use client";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { type FC, useEffect, useState } from "react";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/utilities/tailwind";

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  error?: string;
  description?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
  placeholderText?: string; // Legacy prop for backward compatibility
  className?: string;
  height?: number;
  minHeight?: number;
  disabled?: boolean; // Legacy prop for backward compatibility
  overflow?: boolean;
  id?: string;
  "data-field-id"?: string;
}

const MDEditor = dynamic(() => import("@uiw/react-md-editor").then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[300px] border border-gray-200 dark:border-gray-700 rounded-lg">
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading editor...</p>
    </div>
  ),
});

export const MarkdownEditor: FC<MarkdownEditorProps> = ({
  value = "",
  onChange,
  onBlur,
  label,
  error,
  description,
  isRequired = false,
  isDisabled = false,
  placeholder,
  placeholderText, // Legacy prop
  className = "",
  height = 300,
  minHeight = 270,
  disabled, // Legacy prop
  overflow = false,
  id,
  "data-field-id": dataFieldId,
}) => {
  const { theme: currentTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure client-side only rendering to prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use disabled prop if provided, otherwise use isDisabled
  const isEditorDisabled = disabled !== undefined ? disabled : isDisabled;
  // Use placeholderText if provided, otherwise use placeholder
  const editorPlaceholder = placeholderText || placeholder || "";

  // Handle onChange to ensure it's always a string
  const handleChange = (val?: string) => {
    onChange?.(val || "");
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[300px] border border-gray-200 dark:border-gray-700 rounded-lg">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-bold text-black dark:text-zinc-100 mb-2">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
      )}
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{description}</p>
      )}
      <div
        data-color-mode={currentTheme === "dark" ? "dark" : "light"}
        className={cn("w-full", error && "rounded-lg border border-red-500 dark:border-red-500")}
      >
        <MDEditor
          className={cn(
            "flex-1 bg-white dark:bg-zinc-900 dark:text-white text-black dark:border-gray-600",
            error && "border-red-500 dark:border-red-500",
            isEditorDisabled && "opacity-50 cursor-not-allowed",
            className
          )}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          height={height}
          minHeight={minHeight}
          preview="edit"
          previewOptions={{
            rehypePlugins: [[rehypeSanitize]],
          }}
          overflow={overflow}
          textareaProps={{
            placeholder: editorPlaceholder,
            spellCheck: true,
            style: { height: "100%", minHeight: "100%" },
            disabled: isEditorDisabled,
            id,
          }}
          highlightEnable={false}
        />
      </div>
      {error && <p className="text-sm text-red-400 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
};
