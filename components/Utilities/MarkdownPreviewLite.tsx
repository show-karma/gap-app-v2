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
 * Lightweight markdown renderer powered by streamdown (Vercel's streaming markdown renderer).
 * Built-in sanitization via rehype-harden, GFM support, and streaming-optimized rendering.
 * Replaces the previous markdown-it + DOMPurify approach with a smaller, faster renderer.
 *
 * streamdown and its styles are lazy-loaded to avoid adding them to the main bundle.
 */
export function MarkdownPreviewLite({ source, className }: MarkdownPreviewLiteProps) {
  const { resolvedTheme } = useTheme();

  type StreamdownType = typeof import("streamdown").Streamdown;
  const [StreamdownComponent, setStreamdownComponent] = useState<StreamdownType | null>(null);

  useEffect(() => {
    Promise.all([
      import("streamdown").then((m) => m.Streamdown),
      import("streamdown/styles.css" as string),
    ]).then(([Streamdown]) => {
      setStreamdownComponent(() => Streamdown);
    });
  }, []);

  if (!source || !StreamdownComponent) return null;

  return (
    <div
      className="preview w-full max-w-full text-foreground"
      data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
    >
      <StreamdownComponent
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
      </StreamdownComponent>
    </div>
  );
}
