"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type React from "react";
import rehypeExternalLinks from "rehype-external-links";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import styles from "@/styles/markdown.module.css";
import { cn } from "@/utilities/tailwind";
import { MarkdownPreviewLite } from "./MarkdownPreviewLite";

const HAS_CODE_FENCE = /```\w+/;

// Custom schema that extends the default to allow images
const baseSchema = defaultSchema || { tagNames: [], attributes: {} };
const customSchema = {
  ...baseSchema,
  tagNames: [...(baseSchema.tagNames || []), "img"],
  attributes: {
    ...baseSchema.attributes,
    img: ["src", "alt", "title", "width", "height", "loading"],
  },
};

// Lazy load the heavy markdown preview library (includes refractor for syntax highlighting)
const HeavyPreview = dynamic(() => import("@uiw/react-markdown-preview"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-full" />,
});

export const MarkdownPreview = (props: React.ComponentProps<typeof HeavyPreview>) => {
  const { resolvedTheme } = useTheme();

  // Use lightweight renderer for prose-only content (no code blocks with language tags)
  if (!props.source || !HAS_CODE_FENCE.test(props.source)) {
    return <MarkdownPreviewLite source={props.source} className={props.className} />;
  }

  return (
    <div className="preview w-full max-w-full" data-color-mode={resolvedTheme ?? "light"}>
      <HeavyPreview
        className={cn("wmdeMarkdown", styles.wmdeMarkdown, props.className)}
        rehypePlugins={[
          [rehypeSanitize, customSchema],
          [rehypeExternalLinks, { target: "_blank", rel: ["nofollow", "noopener", "noreferrer"] }],
        ]}
        remarkPlugins={[remarkGfm, remarkBreaks]}
        style={{
          backgroundColor: "transparent",
          color: "currentColor",
          width: "100%",
          maxWidth: "100%",
        }}
        components={{
          p: ({ children }) => <p className="mb-2">{children}</p>,
          code: ({ children, className: langClass }) => (
            <code
              className={cn("bg-neutral-200 dark:bg-neutral-800 p-2 rounded-md", langClass)}
              style={{
                display: "block",
                overflow: "auto",
                maxWidth: "100%",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
              }}
            >
              {children}
            </code>
          ),
        }}
        {...props}
      />
    </div>
  );
};
