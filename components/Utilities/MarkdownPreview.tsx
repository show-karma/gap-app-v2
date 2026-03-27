"use client";

import { code } from "@streamdown/code";
import type { MarkdownPreviewProps } from "@uiw/react-markdown-preview";
import { type Components, Streamdown } from "streamdown";
import "streamdown/styles.css";
import styles from "@/styles/markdown.module.css";
import { cn } from "@/utilities/tailwind";

/**
 * Full-featured markdown renderer powered by streamdown (Vercel's streaming markdown renderer).
 *
 * Replaces @uiw/react-markdown-preview with a significantly lighter, streaming-capable renderer.
 * Handles code syntax highlighting via @streamdown/code (Shiki), GFM tables/task lists,
 * and built-in sanitization via rehype-harden. Supports streaming AI-generated content.
 *
 * Props are typed using MarkdownPreviewProps from @uiw/react-markdown-preview to maintain
 * 100% backward compatibility at call sites. Not all props are forwarded — `rehypeRewrite`
 * and `rehypePlugins` are dropped in favour of streamdown's built-in sanitization. The
 * `components` and `allowElement` props are forwarded to streamdown.
 *
 * Bundle improvement: drops ~600KB of refractor/lowlight at runtime.
 */
export const MarkdownPreview = ({
  source,
  className,
  allowElement,
  components,
}: MarkdownPreviewProps) => {
  if (!source) return null;

  const mergedComponents: Components = {
    p: ({ children }) => (
      <p className="mb-2" style={{ backgroundColor: "transparent", color: "currentColor" }}>
        {children}
      </p>
    ),
    // biome-ignore lint/suspicious/noExplicitAny: @uiw components type differs from streamdown's
    ...(components as any),
  };

  return (
    <div className="preview w-full max-w-full">
      <Streamdown
        mode="static"
        plugins={{ code }}
        className={cn("wmdeMarkdown", styles.wmdeMarkdown, className)}
        allowElement={allowElement ?? undefined}
        components={mergedComponents}
      >
        {source}
      </Streamdown>
    </div>
  );
};
