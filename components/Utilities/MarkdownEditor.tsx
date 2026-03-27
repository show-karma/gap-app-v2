"use client";

import {
  defaultValueCtx,
  Editor,
  editorViewOptionsCtx,
  prosePluginsCtx,
  rootAttrsCtx,
  serializerCtx,
} from "@milkdown/core";
import { clipboard } from "@milkdown/plugin-clipboard";
import { history } from "@milkdown/plugin-history";
import { commonmark } from "@milkdown/preset-commonmark";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { nord } from "@milkdown/theme-nord";
import "@milkdown/theme-nord/lib/style.css";
import { Plugin, PluginKey } from "@milkdown/prose/state";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utilities/tailwind";

// Constants for content validation and performance
const DEFAULT_MAX_LENGTH = 50000; // 50KB max to prevent performance issues
const WARNING_THRESHOLD = 0.9; // Show warning at 90% of max length

const MILKDOWN_CHANGE_KEY = new PluginKey("MILKDOWN_CHANGE_TRACKER");

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
  "aria-describedby"?: string;
  /** Maximum character length (default: 50000) */
  maxLength?: number;
  /** Show character count (default: false) */
  showCharacterCount?: boolean;
  /** Enable preview toggle button (default: true) */
  enablePreviewToggle?: boolean;
}

/**
 * Validates markdown content for potentially dangerous patterns
 * Note: Milkdown sanitizes content, this adds extra validation
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

interface MilkdownEditorInnerProps {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  isDisabled: boolean;
  height: number;
  minHeight: number;
  maxLength: number;
  className?: string;
}

function MilkdownEditorInner({
  value,
  onChange,
  onBlur,
  isDisabled,
  height,
  minHeight,
  maxLength,
  className,
}: MilkdownEditorInnerProps) {
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const maxLengthRef = useRef(maxLength);
  // Store a reference to the editor ctx so the ProseMirror plugin can access it
  const ctxRef = useRef<ReturnType<Editor["ctx"]["get"]> | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onBlurRef.current = onBlur;
  }, [onBlur]);

  useEffect(() => {
    maxLengthRef.current = maxLength;
  }, [maxLength]);

  const { loading } = useEditor((_root) => {
    // ProseMirror plugin that fires onChange whenever the document changes
    const changePlugin = new Plugin({
      key: MILKDOWN_CHANGE_KEY,
      view() {
        return {
          update(view, prevState) {
            if (view.state.doc.eq(prevState.doc)) return;
            try {
              const ctx = ctxRef.current as unknown as {
                get: <T>(slice: { readonly name: string }) => T;
              } | null;
              if (!ctx) return;
              const serializer = ctx.get(serializerCtx);
              const markdown = serializer(view.state.doc);
              const limited =
                markdown.length > maxLengthRef.current
                  ? markdown.slice(0, maxLengthRef.current)
                  : markdown;
              onChangeRef.current?.(limited);
            } catch {
              // Editor ctx not ready or serializer unavailable
            }
          },
          destroy() {},
        };
      },
    });

    const editor = Editor.make()
      .config(nord)
      .config((ctx) => {
        // Capture ctx reference for use in the ProseMirror plugin
        ctxRef.current = ctx as unknown as ReturnType<Editor["ctx"]["get"]>;
        ctx.set(defaultValueCtx, value);
        ctx.set(rootAttrsCtx, {
          "data-milkdown-editor": "true",
          ...(isDisabled ? { contenteditable: "false" } : {}),
        });
        ctx.set(editorViewOptionsCtx, {
          editable: () => !isDisabled,
          handleDOMEvents: {
            blur: () => {
              onBlurRef.current?.();
              return false;
            },
          },
        });
        const existingPlugins = ctx.get(prosePluginsCtx);
        ctx.set(prosePluginsCtx, [...existingPlugins, changePlugin]);
      })
      .use(commonmark)
      .use(history)
      .use(clipboard);

    return editor;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight }}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading editor...</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "milkdown-editor-content w-full",
        isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      style={{ minHeight, height: height > minHeight ? height : undefined }}
    >
      <Milkdown />
    </div>
  );
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
  placeholder: _placeholder,
  placeholderText: _placeholderText,
  className = "",
  height = 300,
  minHeight = 270,
  disabled, // Legacy prop
  overflow: _overflow = false,
  id,
  "data-field-id": dataFieldId,
  "aria-describedby": ariaDescribedBy,
  maxLength = DEFAULT_MAX_LENGTH,
  showCharacterCount = false,
  enablePreviewToggle = true,
}) => {
  const { theme: currentTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  // Ensure client-side only rendering to prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use disabled prop if provided, otherwise use isDisabled
  const isEditorDisabled = disabled !== undefined ? disabled : isDisabled;

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

  // Handle preview mode toggle with loading state
  const handlePreviewToggle = useCallback(() => {
    if (!showPreview) {
      setIsPreviewLoading(true);
      import("@/utilities/markdown").then(({ renderToHTML }) => {
        setPreviewHtml(renderToHTML(value || ""));
        setIsPreviewLoading(false);
      });
    }
    setShowPreview((prev) => !prev);
  }, [showPreview, value]);

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
    <div className="w-full" id={id} data-field-id={dataFieldId} aria-describedby={ariaDescribedBy}>
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
            aria-label={showPreview ? "Show editor" : "Show preview"}
          >
            {isPreviewLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : showPreview ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            <span>{showPreview ? "Edit" : "Preview"}</span>
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
            // biome-ignore lint/suspicious/noArrayIndexKey: static list
            <p key={idx}>{warning}</p>
          ))}
        </div>
      )}

      <div
        data-color-mode={currentTheme === "dark" ? "dark" : "light"}
        className={cn(
          "w-full rounded-lg border overflow-hidden markdown-editor-wrapper",
          error ? "border-red-500 dark:border-red-500" : "border-gray-200 dark:border-gray-700",
          currentTheme === "dark" ? "milkdown-dark" : "milkdown-light"
        )}
      >
        {showPreview ? (
          <MarkdownPreviewPane html={previewHtml} minHeight={minHeight} />
        ) : (
          <MilkdownProvider>
            <MilkdownEditorInner
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isDisabled={isEditorDisabled}
              height={height}
              minHeight={minHeight}
              maxLength={maxLength}
              className={cn(
                "flex-1 bg-white dark:bg-zinc-900 dark:text-white text-black",
                error && "border-red-500 dark:border-red-500",
                className
              )}
            />
          </MilkdownProvider>
        )}
      </div>

      {/* Footer with error and character count */}
      <div className="flex items-start justify-between mt-1 gap-2">
        <div className="flex-1">
          {error && <p className="text-sm text-red-400 dark:text-red-400">{error}</p>}
        </div>
        {showCharacterCount && (
          <CharacterCount characterInfo={characterInfo} maxLength={maxLength} />
        )}
      </div>
    </div>
  );
};

interface CharCountProps {
  characterInfo: { length: number; isAtLimit: boolean; isNearLimit: boolean };
  maxLength: number;
}

function CharacterCount({ characterInfo, maxLength }: CharCountProps) {
  return (
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
  );
}

/**
 * Safe preview pane that renders sanitized HTML.
 * Content is sanitized by DOMPurify inside renderToHTML before being set as innerHTML.
 */
function MarkdownPreviewPane({ html, minHeight }: { html: string; minHeight: number }) {
  return (
    <div
      className="px-4 py-3 prose prose-sm max-w-none dark:prose-invert"
      style={{ minHeight }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized by DOMPurify in renderToHTML
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
