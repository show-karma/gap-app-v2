"use client";

import type { MarkdownPreviewProps } from "@uiw/react-markdown-preview";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { Components } from "streamdown";
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
  const { resolvedTheme } = useTheme();

  type StreamdownType = typeof import("streamdown").Streamdown;
  type CodePluginType = typeof import("@streamdown/code").code;

  const [StreamdownComponent, setStreamdownComponent] = useState<StreamdownType | null>(null);
  const [codePlugin, setCodePlugin] = useState<CodePluginType | null>(null);

  useEffect(() => {
    Promise.all([
      import("streamdown").then((m) => m.Streamdown),
      import("@streamdown/code").then((m) => m.code),
      import("streamdown/styles.css" as string),
    ]).then(([Streamdown, code]) => {
      setStreamdownComponent(() => Streamdown);
      setCodePlugin(() => code);
    });
  }, []);

  if (!source) return null;
  if (!StreamdownComponent || !codePlugin) return null;

  const mergedComponents: Components = {
    p: ({ children }) => (
      <p className="mb-2" style={{ backgroundColor: "transparent", color: "currentColor" }}>
        {children}
      </p>
    ),
    ...(components as Partial<Components>),
  };

  return (
    <div
      className="preview w-full max-w-full text-foreground"
      data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
    >
      <StreamdownComponent
        mode="static"
        plugins={{ code: codePlugin }}
        className={cn("wmdeMarkdown", styles.wmdeMarkdown, className)}
        allowElement={allowElement ?? undefined}
        components={mergedComponents}
      >
        {source}
      </StreamdownComponent>
    </div>
  );
};
