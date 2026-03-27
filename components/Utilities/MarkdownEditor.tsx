"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
// Tiptap is the editor engine that Vrite (https://github.com/vriteio/vrite) uses under the hood.
// Vrite ships as a headless CMS platform rather than a standalone npm editor
// component, so we use Tiptap directly with the tiptap-markdown extension to
// keep the exact same markdown-in / markdown-out contract as the previous
// @uiw/react-md-editor implementation.
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "tiptap-markdown";
import styles from "@/styles/markdown.module.css";
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
  "aria-describedby"?: string;
  /** Maximum character length (default: 50000) */
  maxLength?: number;
  /** Show character count (default: false) */
  showCharacterCount?: boolean;
  /** Enable preview toggle button (default: true) */
  enablePreviewToggle?: boolean;
}

/**
 * Validates markdown content for potentially dangerous patterns.
 * Tiptap-markdown handles sanitization; this provides early user feedback.
 */
function validateMarkdownContent(content: string): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  const suspiciousPatterns = [/javascript:/gi, /data:text\/html/gi, /on\w+\s*=/gi, /<script/gi];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      warnings.push("Content contains potentially unsafe patterns that will be sanitized");
      break;
    }
  }

  return { isValid: true, warnings };
}

/**
 * Preview panel: renders the current editor content as sanitized HTML using
 * DOMPurify (via the shared renderToHTML utility) so dangerouslySetInnerHTML
 * is safe.
 */
function PreviewPanel({
  html,
  minHeight,
  maxHeight,
  className,
}: {
  html: string;
  minHeight: number;
  maxHeight: number | undefined;
  className: string;
}) {
  const [safeHtml, setSafeHtml] = useState("");

  useEffect(() => {
    // renderToHTML uses DOMPurify — browser-only
    import("@/utilities/markdown").then(({ renderToHTML }) => {
      setSafeHtml(renderToHTML(html));
    });
  }, [html]);

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none p-3 overflow-auto",
        "bg-white dark:bg-zinc-900 text-black dark:text-white",
        "wmdeMarkdown wmde-markdown",
        styles.wmdeMarkdown,
        className
      )}
      style={{ minHeight, maxHeight }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized by DOMPurify inside renderToHTML
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
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
  placeholder,
  placeholderText,
  className = "",
  height = 300,
  minHeight = 270,
  disabled,
  overflow = false,
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
  // Track whether the latest value change originated from an external prop update
  const externalUpdateRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isEditorDisabled = disabled !== undefined ? disabled : isDisabled;
  const editorPlaceholder = placeholderText || placeholder || "";

  const characterInfo = useMemo(() => {
    const length = value?.length || 0;
    const percentage = length / maxLength;
    const isNearLimit = percentage >= WARNING_THRESHOLD;
    const isAtLimit = length >= maxLength;
    return { length, percentage, isNearLimit, isAtLimit };
  }, [value, maxLength]);

  const contentValidation = useMemo(() => validateMarkdownContent(value || ""), [value]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "nofollow noopener noreferrer",
          target: "_blank",
        },
      }),
      Image,
      Placeholder.configure({ placeholder: editorPlaceholder }),
      Markdown.configure({
        html: false,
        tightLists: true,
        breaks: true,
      }),
    ],
    content: value,
    editable: !isEditorDisabled,
    onUpdate({ editor: ed }) {
      if (externalUpdateRef.current) return;
      const md = ed.storage.markdown.getMarkdown() as string;
      const truncated = md.length > maxLength ? md.slice(0, maxLength) : md;
      onChange?.(truncated);
    },
    onBlur() {
      onBlur?.();
    },
    // Suppress SSR hydration warning — editor is client-only
    immediatelyRender: false,
  });

  // Sync external value changes into editor without triggering onChange
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.storage.markdown.getMarkdown() as string;
    if (current !== value) {
      externalUpdateRef.current = true;
      editor.commands.setContent(value ?? "");
      externalUpdateRef.current = false;
    }
  }, [editor, value]);

  // Update editable state when disabled prop changes
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!isEditorDisabled);
  }, [editor, isEditorDisabled]);

  const handlePreviewToggle = useCallback(() => {
    if (!showPreview) {
      setIsPreviewLoading(true);
      setShowPreview(true);
      setTimeout(() => setIsPreviewLoading(false), 100);
    } else {
      setShowPreview(false);
    }
  }, [showPreview]);

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
            // biome-ignore lint/suspicious/noArrayIndexKey: static warning list with stable length
            <p key={idx}>{warning}</p>
          ))}
        </div>
      )}

      <div
        data-field-id={dataFieldId}
        data-color-mode={currentTheme === "dark" ? "dark" : "light"}
        className={cn(
          "w-full rounded-lg border overflow-hidden markdown-editor-wrapper",
          error ? "border-red-500 dark:border-red-500" : "border-gray-200 dark:border-gray-700"
        )}
      >
        {showPreview ? (
          <PreviewPanel
            html={editor?.getHTML() ?? ""}
            minHeight={minHeight}
            maxHeight={overflow ? undefined : height}
            className={className}
          />
        ) : (
          /* Edit panel */
          <div
            id={id}
            aria-describedby={ariaDescribedBy}
            className={cn(
              "tiptap-editor-wrapper bg-white dark:bg-zinc-900 overflow-auto",
              isEditorDisabled && "opacity-50 cursor-not-allowed"
            )}
            style={{ minHeight, maxHeight: overflow ? undefined : height }}
          >
            {/* Minimal formatting toolbar */}
            <MarkdownToolbar editor={editor} disabled={isEditorDisabled} />
            <EditorContent
              editor={editor}
              className={cn(
                "p-3 text-black dark:text-white",
                "prose prose-sm max-w-none",
                "[&_.ProseMirror]:outline-none",
                "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
                "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400",
                "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
                "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
                "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
                className
              )}
            />
          </div>
        )}
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

// ---------------------------------------------------------------------------
// Internal toolbar
// ---------------------------------------------------------------------------

interface MarkdownToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
}

function MarkdownToolbar({ editor, disabled }: MarkdownToolbarProps) {
  return (
    <div className="flex flex-wrap gap-1 px-2 pt-2 pb-1 border-b border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800">
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBold().run()}
        isActive={editor?.isActive("bold") ?? false}
        disabled={disabled}
        title="Bold"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        isActive={editor?.isActive("italic") ?? false}
        disabled={disabled}
        title="Italic"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        isActive={editor?.isActive("strike") ?? false}
        disabled={disabled}
        title="Strikethrough"
      >
        <s>S</s>
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor?.isActive("heading", { level: 2 }) ?? false}
        disabled={disabled}
        title="Heading 2"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor?.isActive("heading", { level: 3 }) ?? false}
        disabled={disabled}
        title="Heading 3"
      >
        H3
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        isActive={editor?.isActive("bulletList") ?? false}
        disabled={disabled}
        title="Bullet list"
      >
        {"•-"}
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        isActive={editor?.isActive("orderedList") ?? false}
        disabled={disabled}
        title="Ordered list"
      >
        {"1."}
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        isActive={editor?.isActive("blockquote") ?? false}
        disabled={disabled}
        title="Blockquote"
      >
        {'"'}
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleCode().run()}
        isActive={editor?.isActive("code") ?? false}
        disabled={disabled}
        title="Inline code"
      >
        {"<>"}
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        isActive={editor?.isActive("codeBlock") ?? false}
        disabled={disabled}
        title="Code block"
      >
        {"{}"}
      </ToolbarButton>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent editor from losing focus
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={cn(
        "min-w-[28px] h-7 px-1.5 rounded text-xs font-medium transition-colors",
        isActive
          ? "bg-gray-200 dark:bg-zinc-600 text-black dark:text-white"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="w-px h-5 bg-gray-200 dark:bg-zinc-600 mx-0.5 self-center" />;
}
