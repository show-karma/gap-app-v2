"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import styles from "@/styles/markdown.module.css";
import { cn } from "@/utilities/tailwind";

interface MarkdownPreviewLiteProps {
  source?: string;
  className?: string;
}

/**
 * Lightweight markdown renderer using markdown-it + DOMPurify (already in the bundle).
 * Content is sanitized by DOMPurify inside renderToHTML before being set as innerHTML.
 * Used for prose-only content that doesn't need syntax highlighting.
 *
 * Renders only on the client because DOMPurify requires a browser DOM.
 */
export function MarkdownPreviewLite({ source, className }: MarkdownPreviewLiteProps) {
  const { resolvedTheme } = useTheme();
  const [html, setHtml] = useState("");

  useEffect(() => {
    if (!source) {
      setHtml("");
      return;
    }
    // Dynamic import to avoid SSR issues — DOMPurify requires a browser DOM
    import("@/utilities/markdown").then(({ renderToHTML }) => {
      setHtml(renderToHTML(source));
    });
  }, [source]);

  if (!source) return null;

  if (!html) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-full" />;
  }

  return (
    <div className="preview w-full max-w-full" data-color-mode={resolvedTheme ?? "light"}>
      <div
        className={cn("wmdeMarkdown", "wmde-markdown", styles.wmdeMarkdown, className)}
        style={{
          backgroundColor: "transparent",
          color: "currentColor",
          width: "100%",
          maxWidth: "100%",
        }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized by DOMPurify in renderToHTML
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
