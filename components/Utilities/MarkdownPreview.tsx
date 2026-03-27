"use client";
import "md-editor-rt/lib/preview.css";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type React from "react";
import styles from "@/styles/markdown.module.css";
import { cn } from "@/utilities/tailwind";
import { MarkdownPreviewLite } from "./MarkdownPreviewLite";

const HAS_CODE_FENCE = /```\w+/;

// Lazy load the heavy markdown preview library (includes syntax highlighting via md-editor-rt)
const MdPreview = dynamic(() => import("md-editor-rt").then((mod) => mod.MdPreview), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-full" />,
});

interface MarkdownPreviewProps {
  /** Markdown source text to render */
  source?: string;
  className?: string;
  style?: React.CSSProperties;
  // Legacy props accepted for call-site compatibility but not used in this implementation
  // biome-ignore lint/suspicious/noExplicitAny: legacy prop pass-through for API compatibility
  allowElement?: (element: any, index: number, parent: any) => boolean;
  // biome-ignore lint/suspicious/noExplicitAny: legacy prop pass-through for API compatibility
  rehypeRewrite?: (node: any, index?: number, parent?: any) => void;
  // biome-ignore lint/suspicious/noExplicitAny: legacy prop pass-through for API compatibility
  components?: Record<string, React.ComponentType<any>>;
}

export const MarkdownPreview = ({
  source,
  className,
  style,
  // Legacy props are accepted but ignored — md-editor-rt uses its own sanitization pipeline
  allowElement: _allowElement,
  rehypeRewrite: _rehypeRewrite,
  components: _components,
}: MarkdownPreviewProps) => {
  const { resolvedTheme } = useTheme();

  // Use lightweight renderer for prose-only content (no code blocks with language tags)
  if (!source || !HAS_CODE_FENCE.test(source)) {
    return <MarkdownPreviewLite source={source} className={className} />;
  }

  return (
    <div className="preview w-full max-w-full" data-color-mode={resolvedTheme ?? "light"}>
      <MdPreview
        value={source}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        className={cn("wmdeMarkdown", styles.wmdeMarkdown, className)}
        style={{
          backgroundColor: "transparent",
          color: "currentColor",
          width: "100%",
          maxWidth: "100%",
          ...style,
        }}
        noMermaid
        noKatex
      />
    </div>
  );
};
