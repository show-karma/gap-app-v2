"use client";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/utilities/tailwind";

// Constants for content validation and performance
const DEFAULT_MAX_LENGTH = 50000; // 50KB max to prevent performance issues
const WARNING_THRESHOLD = 0.9; // Show warning at 90% of max length

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
  /** Maximum character length (default: 50000) */
  maxLength?: number;
  /** Show character count (default: false) */
  showCharacterCount?: boolean;
  /** Enable preview toggle button (default: true) */
  enablePreviewToggle?: boolean;
}

const MDEditor = dynamic(() => import("@uiw/react-md-editor").then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[300px] border border-gray-200 dark:border-gray-700 rounded-lg">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading editor...</span>
    </div>
  ),
});

/**
 * Validates markdown content for potentially dangerous patterns
 * Note: rehype-sanitize handles most XSS, this adds extra validation
 */
function validateMarkdownContent(content: string): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check for suspicious patterns (data URIs with scripts, javascript: links)
  const suspiciousPatterns = [
    /javascript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi, // onclick=, onerror=, etc.
    /<script/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      warnings.push("Content contains potentially unsafe patterns that will be sanitized");
      break;
    }
  }

  return { isValid: true, warnings };
}

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
  maxLength = DEFAULT_MAX_LENGTH,
  showCharacterCount = false,
  enablePreviewToggle = true,
}) => {
  const { theme: currentTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [previewMode, setPreviewMode] = useState<"edit" | "live" | "preview">("edit");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Ensure client-side only rendering to prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use disabled prop if provided, otherwise use isDisabled
  const isEditorDisabled = disabled !== undefined ? disabled : isDisabled;
  // Use placeholderText if provided, otherwise use placeholder
  const editorPlaceholder = placeholderText || placeholder || "";

  // Calculate character count info
  const characterInfo = useMemo(() => {
    const length = value?.length || 0;
    const percentage = length / maxLength;
    const isNearLimit = percentage >= WARNING_THRESHOLD;
    const isAtLimit = length >= maxLength;
    return { length, percentage, isNearLimit, isAtLimit };
  }, [value, maxLength]);

  // Validate content
  const contentValidation = useMemo(() => validateMarkdownContent(value || ""), [value]);

  // Handle onChange with length limit
  const handleChange = useCallback(
    (val?: string) => {
      const newValue = val || "";
      // Enforce max length
      if (newValue.length > maxLength) {
        onChange?.(newValue.slice(0, maxLength));
      } else {
        onChange?.(newValue);
      }
    },
    [onChange, maxLength]
  );

  // Handle preview mode toggle with loading state
  const handlePreviewToggle = useCallback(() => {
    if (previewMode === "edit") {
      setIsPreviewLoading(true);
      setPreviewMode("preview");
      // Simulate brief loading for large content
      setTimeout(() => setIsPreviewLoading(false), 100);
    } else {
      setPreviewMode("edit");
    }
  }, [previewMode]);

  if (!mounted) {
    return (
      <div
        className="flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg"
        style={{ height }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading editor...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with label and preview toggle */}
      <div className="flex items-center justify-between mb-2">
        {label && (
          <label htmlFor={id} className="block text-sm font-bold text-black dark:text-zinc-100">
            {label} {isRequired && <span className="text-red-500">*</span>}
          </label>
        )}
        {enablePreviewToggle && !isEditorDisabled && (
          <button
            type="button"
            onClick={handlePreviewToggle}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            aria-label={previewMode === "edit" ? "Show preview" : "Show editor"}
          >
            {isPreviewLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : previewMode === "edit" ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            <span>{previewMode === "edit" ? "Preview" : "Edit"}</span>
          </button>
        )}
      </div>

      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{description}</p>
      )}

      {/* Content validation warnings */}
      {contentValidation.warnings.length > 0 && (
        <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-700 dark:text-yellow-400">
          {contentValidation.warnings.map((warning, idx) => (
            <p key={idx}>{warning}</p>
          ))}
        </div>
      )}

      <div
        data-color-mode={currentTheme === "dark" ? "dark" : "light"}
        className={cn(
          "w-full rounded-lg border overflow-hidden markdown-editor-wrapper",
          error ? "border-red-500 dark:border-red-500" : "border-gray-200 dark:border-gray-700"
        )}
      >
        <MDEditor
          className={cn(
            "flex-1 bg-white dark:bg-zinc-900 dark:text-white text-black",
            error && "border-red-500 dark:border-red-500",
            isEditorDisabled && "opacity-50 cursor-not-allowed",
            className
          )}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          height={height}
          minHeight={minHeight}
          preview={previewMode}
          previewOptions={{
            rehypePlugins: [[rehypeSanitize]],
          }}
          overflow={overflow}
          textareaProps={{
            placeholder: editorPlaceholder,
            spellCheck: true,
            style: { height: "100%", minHeight: "100%", paddingRight: "0.5rem" },
            disabled: isEditorDisabled,
            id,
            maxLength,
          }}
          highlightEnable={false}
        />
      </div>

      {/* Footer with error and character count */}
      <div className="flex items-start justify-between mt-1 gap-2">
        <div className="flex-1">
          {error && <p className="text-sm text-red-400 dark:text-red-400">{error}</p>}
        </div>
        {showCharacterCount && (
          <p
            className={cn(
              "text-xs text-right whitespace-nowrap",
              characterInfo.isAtLimit
                ? "text-red-500 dark:text-red-400 font-medium"
                : characterInfo.isNearLimit
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-gray-500 dark:text-gray-400"
            )}
          >
            {characterInfo.length.toLocaleString()}/{maxLength.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};
