"use client";

import { useTheme } from "next-themes";
import { type CSSProperties, useEffect, useState } from "react";
import styles from "@/styles/markdown.module.css";
import { cn } from "@/utilities/tailwind";

// ---------------------------------------------------------------------------
// MarkdownPreview — Vrite/Tiptap replacement
// ---------------------------------------------------------------------------
// Vrite (https://github.com/vriteio/vrite) is a headless CMS platform that
// uses Tiptap under the hood; it does not publish a standalone React preview
// component. For rendering-only use cases we use DOMPurify + markdown-it
// (already bundled) via the shared renderToHTML utility, which is the same
// approach used throughout the app and avoids adding @uiw/react-markdown-preview
// to the bundle.
//
// Props interface is kept compatible with @uiw/react-markdown-preview so no
// call sites need to change.
// ---------------------------------------------------------------------------

export interface MarkdownPreviewProps {
  source?: string;
  className?: string;
  style?: CSSProperties;
  /** @deprecated — rendered via DOMPurify+markdown-it; remark/rehype plugins are ignored */
  rehypePlugins?: unknown[];
  /** @deprecated — rendered via DOMPurify+markdown-it; remark/rehype plugins are ignored */
  remarkPlugins?: unknown[];
  /** @deprecated — rendered via DOMPurify+markdown-it; component overrides are ignored */
  components?: Record<string, unknown>;
  [key: string]: unknown;
}

export const MarkdownPreview = ({ source, className, style }: MarkdownPreviewProps) => {
  const { theme: currentTheme } = useTheme();
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    if (!source) {
      setHtml("");
      return;
    }
    // Dynamic import keeps DOMPurify out of the SSR bundle.
    // renderToHTML uses DOMPurify.sanitize — output is safe for innerHTML.
    import("@/utilities/markdown").then(({ renderToHTML }) => {
      setHtml(renderToHTML(source));
    });
  }, [source]);

  if (!source) return null;

  if (!html) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-full" />;
  }

  return (
    <div className="preview w-full max-w-full" data-color-mode={currentTheme}>
      <div
        className={cn("wmdeMarkdown", styles.wmdeMarkdown, className)}
        style={{
          backgroundColor: "transparent",
          color: currentTheme === "dark" ? "white" : "rgb(36, 41, 47)",
          width: "100%",
          maxWidth: "100%",
          ...style,
        }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized by DOMPurify inside renderToHTML
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
