"use client";

import { useTheme } from "next-themes";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import styles from "@/styles/markdown.module.css";
import { cn } from "@/utilities/tailwind";

interface MarkdownPreviewLiteProps {
  source?: string;
  className?: string;
}

/**
 * Lightweight markdown renderer powered by streamdown (Vercel's streaming markdown renderer).
 * Built-in sanitization via rehype-harden, GFM support, and streaming-optimized rendering.
 * Replaces the previous markdown-it + DOMPurify approach with a smaller, faster renderer.
 *
 * Renders synchronously — no async state updates needed.
 */
export function MarkdownPreviewLite({ source, className }: MarkdownPreviewLiteProps) {
  const { resolvedTheme } = useTheme();

  if (!source) return null;

  return (
    <div
      className="preview w-full max-w-full text-foreground"
      data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
    >
      <Streamdown
        mode="static"
        className={cn("wmdeMarkdown", "wmde-markdown", styles.wmdeMarkdown, className)}
        components={{
          p: ({ children }) => (
            <p className="mb-2" style={{ backgroundColor: "transparent", color: "currentColor" }}>
              {children}
            </p>
          ),
        }}
      >
        {source}
      </Streamdown>
    </div>
  );
}
